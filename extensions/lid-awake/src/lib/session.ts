import { getPreferenceValues, launchCommand, LaunchType, LocalStorage } from "@raycast/api";
import { getBattery, getBootTime, isRuleInstalled, isSleepDisabled, setSleepDisabled } from "./system";
import { AutoDisableReason, Battery, Session, shouldAutoDisable } from "./parse";

export type { Session } from "./parse";

// Each session is stored under its own key, so clearing one can never delete a session another command just saved.
const SESSION_PREFIX = "session:";
// Key used by older builds, which stored a single session. Removed on Turn Off, not read.
const LEGACY_SESSION_KEY = "session";

export const PRESETS: (number | null)[] = [30, 60, 120, 240, null];

export type Status = { on: boolean; session: Session | null; battery: Battery };

function getPrefs(): { thresholdPercent: number; defaultMinutes: number | null } {
  const prefs = getPreferenceValues<Preferences>();
  const thresholdPercent = Number(prefs.batteryThreshold) || 0;
  const duration = Number(prefs.defaultDuration);
  return {
    thresholdPercent,
    defaultMinutes: Number.isFinite(duration) && duration > 0 ? duration : null,
  };
}

export function getDefaultMinutes(): number | null {
  return getPrefs().defaultMinutes;
}

export function durationLabel(minutes: number | null): string {
  if (minutes === null) {
    return "Indefinitely";
  }
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = minutes / 60;
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

// Session keys carry a sequence number, not the start time: the clock can move backward, but a sequence number only grows.
function sessionKey(seq: number): string {
  return `${SESSION_PREFIX}${seq}`;
}

type SessionEntry = { key: string; seq: number; session: Session };

async function readSessionEntries(): Promise<SessionEntry[]> {
  const items = await LocalStorage.allItems();
  const entries: SessionEntry[] = [];
  for (const [key, value] of Object.entries(items)) {
    if (!key.startsWith(SESSION_PREFIX)) {
      continue;
    }
    // Keys from older builds hold a millisecond start time, which is a large number, so a new Start still outranks them.
    const seq = Number(key.slice(SESSION_PREFIX.length));
    if (!Number.isSafeInteger(seq) || seq <= 0) {
      continue;
    }
    try {
      const session = JSON.parse(String(value)) as Session;
      if (typeof session.startedAt === "number") {
        entries.push({ key, seq, session });
      }
    } catch {
      // Not a session; ignore it.
    }
  }
  return entries;
}

async function readSession(): Promise<SessionEntry | null> {
  try {
    // If more than one session is stored, the one with the highest sequence number is the current session.
    let newest: SessionEntry | null = null;
    for (const entry of await readSessionEntries()) {
      if (!newest || entry.seq > newest.seq) {
        newest = entry;
      }
    }
    return newest;
  } catch {
    return null;
  }
}

// Returns the key the session was written under, so a later undo can remove exactly this session.
async function writeSession(session: Session): Promise<string> {
  // The new sequence number is one past every stored one, so this Start outranks any session already saved.
  // Overlapping Starts can compute the same number and write the same key. The last write wins, which is acceptable.
  const existing = await readSessionEntries();
  const seq = Math.max(0, ...existing.map((entry) => entry.seq)) + 1;
  const key = sessionKey(seq);
  await LocalStorage.setItem(key, JSON.stringify(session));
  // Drop only older sessions (lower sequence numbers). A higher one came from an overlapping Start and must stay.
  try {
    for (const entry of await readSessionEntries()) {
      if (entry.seq < seq) {
        await LocalStorage.removeItem(entry.key);
      }
    }
  } catch {
    // Leftover older sessions are harmless, since readSession always picks the newest.
  }
  return key;
}

// Removes only the session under this key. Other sessions, including one another command just saved, are kept.
async function clearSession(key: string): Promise<void> {
  await LocalStorage.removeItem(key);
}

async function clearAllSessions(): Promise<void> {
  for (const key of Object.keys(await LocalStorage.allItems())) {
    if (key.startsWith(SESSION_PREFIX)) {
      await LocalStorage.removeItem(key);
    }
  }
  await LocalStorage.removeItem(LEGACY_SESSION_KEY);
}

// LocalStorage has no atomic operations, so the read-check-write steps below run one at a time in this process.
let queue: Promise<unknown> = Promise.resolve();
function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

export async function refreshMenuBar(): Promise<void> {
  try {
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  } catch {
    // Menu bar command not enabled yet; nothing to refresh.
  }
}

// Only the menu bar command runs auto-off. It is launched only after the session is saved, so its check sees the new
// session instead of racing with it. If it cannot launch, enable undoes the start, because nothing would turn Lid Awake off.
async function requireMenuBar(): Promise<void> {
  try {
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  } catch {
    throw new Error(
      "Run Lid Awake Menu Bar once and keep it enabled in Raycast. It turns Lid Awake off when the timer ends, the battery is low, or after a restart",
    );
  }
}

// Returns the key of the session it saved.
async function startSession(minutes: number | null): Promise<string> {
  if (!(await isRuleInstalled())) {
    throw new Error("Run Set up Lid Awake first, so Lid Awake can turn itself off while the lid is closed");
  }
  const { thresholdPercent } = getPrefs();
  const battery = await getBattery();
  if (thresholdPercent > 0 && battery.hasBattery && !battery.onAC && battery.percent != null) {
    if (battery.percent <= thresholdPercent) {
      throw new Error(`Battery is at ${battery.percent}%, at or below your ${thresholdPercent}% cutoff`);
    }
  }

  const bootTime = await getBootTime();
  const now = Date.now();
  const session: Session = {
    startedAt: now,
    endsAt: minutes ? now + minutes * 60_000 : null,
    bootTime,
  };

  await setSleepDisabled(true);
  let key: string;
  try {
    key = await writeSession(session);
  } catch (error) {
    await setSleepDisabled(false).catch(() => undefined);
    throw error;
  }
  // Auto-off from the menu bar or Turn Off from another command may have changed sleep while this session was being
  // saved. If sleep is now off, turn it back on, unless the sessions were cleared in the meantime.
  if (!(await isSleepDisabled())) {
    await keepAwakeWhileSessionStored();
  }
  return key;
}

// Sleep stays disabled while any session is stored. Turn Off in another command may clear the sessions while this
// runs, so check again after disabling sleep and allow it again if nothing is stored any more.
async function keepAwakeWhileSessionStored(): Promise<void> {
  if (!(await readSession())) {
    return;
  }
  await setSleepDisabled(true);
  if (!(await readSession())) {
    await setSleepDisabled(false, { allowPrompt: false });
  }
}

// Removes only the session this Start saved. If no other session is stored, sleep goes back on. Runs when the menu bar
// cannot launch, so nothing else would turn Lid Awake off.
async function undoStart(key: string): Promise<void> {
  await clearSession(key);
  if (!(await readSession())) {
    await setSleepDisabled(false, { allowPrompt: false });
  }
}

async function stopSession(options: { allowPrompt?: boolean }): Promise<void> {
  await setSleepDisabled(false, { allowPrompt: options.allowPrompt });
  await clearAllSessions();
  // A Start in another command may have disabled sleep again between the two steps above. If sleep is on and no
  // session is stored, allow sleep again. A failure here is ignored, since the Turn Off itself has succeeded.
  if ((await isSleepDisabled()) && !(await readSession())) {
    await setSleepDisabled(false, { allowPrompt: false }).catch(() => undefined);
  }
}

// The status plus the stored entry it was built from, so callers can clear or compare that exact entry.
type StatusRead = { status: Status; entry: SessionEntry | null };

async function readStatus(): Promise<StatusRead> {
  // Read the session first: enable turns sleep on before saving, so a session seen here means sleep is already on.
  let entry = await readSession();
  let on = await isSleepDisabled();
  if (!on && entry) {
    // Sleep is off, so this session is stale. Clear only its own key: a session another enable saved meanwhile is kept.
    await clearSession(entry.key);
    // Report whatever session is stored now. If a new one was saved, check sleep again, since it may be on.
    entry = await readSession();
    if (entry) {
      on = await isSleepDisabled();
    }
  }
  const battery = await getBattery();
  return { status: { on, session: entry?.session ?? null, battery }, entry };
}

async function autoDisable(): Promise<AutoDisableReason | null> {
  const { status, entry } = await readStatus();
  if (!status.on || !entry) {
    // Either off, or on without a session (turned on outside the extension): leave it alone.
    return null;
  }
  const { thresholdPercent } = getPrefs();
  const reason = shouldAutoDisable({
    session: entry.session,
    currentBootTime: await getBootTime(),
    now: Date.now(),
    battery: status.battery,
    thresholdPercent,
  });
  if (!reason) {
    return null;
  }
  await setSleepDisabled(false, { allowPrompt: false });
  // A Start may have saved a newer session (higher sequence number) while sleep was being turned off. That session wins, so sleep goes back on.
  const current = await readSession();
  if (current && current.seq > entry.seq) {
    await keepAwakeWhileSessionStored().catch(() => undefined);
    return null;
  }
  // Clear only the session we turned off for. A Start that saves a session after the check above keeps its own key.
  await clearSession(entry.key);
  return reason;
}

export async function enable(minutes: number | null): Promise<void> {
  const key = await serialized(() => startSession(minutes));
  try {
    // Outside the queue so launching the menu bar command never holds up other session actions.
    // This launch also refreshes the menu bar, so it is not repeated.
    await requireMenuBar();
  } catch (error) {
    await serialized(() => undoStart(key)).catch(() => undefined);
    throw error;
  }
}

export async function disable(options: { allowPrompt?: boolean } = { allowPrompt: true }): Promise<void> {
  await serialized(() => stopSession(options));
  await refreshMenuBar();
}

export async function getStatus(): Promise<Status> {
  return serialized(async () => (await readStatus()).status);
}

export async function enforce(): Promise<AutoDisableReason | null> {
  const reason = await serialized(autoDisable);
  if (reason) {
    await refreshMenuBar();
  }
  return reason;
}
