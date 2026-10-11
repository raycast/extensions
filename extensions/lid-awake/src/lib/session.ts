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

function sessionKey(startedAt: number): string {
  return `${SESSION_PREFIX}${startedAt}`;
}

async function readSessionEntries(): Promise<{ key: string; session: Session }[]> {
  const items = await LocalStorage.allItems();
  const entries: { key: string; session: Session }[] = [];
  for (const [key, value] of Object.entries(items)) {
    if (!key.startsWith(SESSION_PREFIX)) {
      continue;
    }
    try {
      const session = JSON.parse(String(value)) as Session;
      if (typeof session.startedAt === "number") {
        entries.push({ key, session });
      }
    } catch {
      // Not a session; ignore it.
    }
  }
  return entries;
}

async function readSession(): Promise<Session | null> {
  try {
    // If more than one session is stored, the newest one is the current session.
    let newest: Session | null = null;
    for (const { session } of await readSessionEntries()) {
      if (!newest || session.startedAt > newest.startedAt) {
        newest = session;
      }
    }
    return newest;
  } catch {
    return null;
  }
}

async function writeSession(session: Session): Promise<void> {
  await LocalStorage.setItem(sessionKey(session.startedAt), JSON.stringify(session));
  // Drop only older sessions. A newer one came from an overlapping Start and must stay.
  try {
    for (const entry of await readSessionEntries()) {
      if (entry.session.startedAt < session.startedAt) {
        await LocalStorage.removeItem(entry.key);
      }
    }
  } catch {
    // Leftover older sessions are harmless, since readSession always picks the newest.
  }
}

// Removes only the session with this start time. Other sessions, including one another command just saved, are kept.
async function clearSession(startedAt: number): Promise<void> {
  await LocalStorage.removeItem(sessionKey(startedAt));
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

// Only the menu bar command runs auto-off, so enable must fail before sleep is turned off if it cannot be launched.
async function requireMenuBar(): Promise<void> {
  try {
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  } catch {
    throw new Error(
      "Turn on the Lid Awake Menu Bar command in Raycast first. It turns Lid Awake off when the timer ends, the battery is low, or after a restart",
    );
  }
}

async function startSession(minutes: number | null): Promise<void> {
  if (!(await isRuleInstalled())) {
    throw new Error("Run Set up Lid Awake first, so Lid Awake can turn itself off while the lid is closed");
  }
  const { thresholdPercent } = getPrefs();
  const battery = await getBattery();
  if (thresholdPercent > 0 && battery.hasBattery && !battery.onAC && battery.percent != null) {
    if (battery.percent <= thresholdPercent) {
      throw new Error(`Battery is at ${battery.percent}%, below your ${thresholdPercent}% cutoff`);
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
  try {
    await writeSession(session);
  } catch (error) {
    await setSleepDisabled(false).catch(() => undefined);
    throw error;
  }
}

async function stopSession(options: { allowPrompt?: boolean }): Promise<void> {
  await setSleepDisabled(false, { allowPrompt: options.allowPrompt });
  await clearAllSessions();
}

async function readStatus(): Promise<Status> {
  // Read the session first: enable turns sleep on before saving, so a session seen here means sleep is already on.
  let session = await readSession();
  let on = await isSleepDisabled();
  if (!on && session) {
    // Sleep is off, so this session is stale. Clear only its own key: a session another enable saved meanwhile is kept.
    await clearSession(session.startedAt);
    // Report whatever session is stored now. If a new one was saved, check sleep again, since it may be on.
    session = await readSession();
    if (session) {
      on = await isSleepDisabled();
    }
  }
  const battery = await getBattery();
  return { on, session, battery };
}

async function autoDisable(): Promise<AutoDisableReason | null> {
  const status = await readStatus();
  if (!status.on || !status.session) {
    // Either off, or on without a session (turned on outside the extension): leave it alone.
    return null;
  }
  const { thresholdPercent } = getPrefs();
  const reason = shouldAutoDisable({
    session: status.session,
    currentBootTime: await getBootTime(),
    now: Date.now(),
    battery: status.battery,
    thresholdPercent,
  });
  if (!reason) {
    return null;
  }
  await setSleepDisabled(false, { allowPrompt: false });
  // A Start may have saved a newer session while sleep was being turned off. That session wins, so sleep goes back on.
  const current = await readSession();
  if (current && current.startedAt > status.session.startedAt) {
    await setSleepDisabled(true).catch(() => undefined);
    return null;
  }
  // Clear only the session we turned off for. A Start that saves a session after the check above keeps its own key.
  await clearSession(status.session.startedAt);
  return reason;
}

export async function enable(minutes: number | null): Promise<void> {
  await requireMenuBar();
  await serialized(() => startSession(minutes));
  // Refreshed outside the queue so launching the menu bar command never holds up other session actions.
  await refreshMenuBar();
}

export async function disable(options: { allowPrompt?: boolean } = { allowPrompt: true }): Promise<void> {
  await serialized(() => stopSession(options));
  await refreshMenuBar();
}

export async function getStatus(): Promise<Status> {
  return serialized(readStatus);
}

export async function enforce(): Promise<AutoDisableReason | null> {
  const reason = await serialized(autoDisable);
  if (reason) {
    await refreshMenuBar();
  }
  return reason;
}
