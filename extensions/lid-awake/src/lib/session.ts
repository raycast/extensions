import { getPreferenceValues, launchCommand, LaunchType, LocalStorage } from "@raycast/api";
import { getBattery, getBootTime, isRuleInstalled, isSleepDisabled, setSleepDisabled } from "./system";
import { AutoDisableReason, Battery, Session, shouldAutoDisable } from "./parse";

export type { Session } from "./parse";

const SESSION_KEY = "session";

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

async function readSession(): Promise<Session | null> {
  try {
    const raw = await LocalStorage.getItem<string>(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

async function writeSession(session: Session): Promise<void> {
  await LocalStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

async function clearSession(): Promise<void> {
  await LocalStorage.removeItem(SESSION_KEY);
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
  await clearSession();
}

async function readStatus(): Promise<Status> {
  // Read the session first: enable turns sleep on before saving, so a session seen here means sleep is already on.
  let session = await readSession();
  let on = await isSleepDisabled();
  if (!on && session) {
    // Clear only the session we read. If another enable saved a new one meanwhile, keep it and re-check sleep.
    const current = await readSession();
    if (current?.startedAt === session.startedAt) {
      await clearSession();
      session = null;
    } else {
      session = current;
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
  // A Start may have saved a new session while sleep was being turned off. That session wins, so sleep goes back on.
  const current = await readSession();
  if (current && current.startedAt !== status.session.startedAt) {
    await setSleepDisabled(true).catch(() => undefined);
    return null;
  }
  await clearSession();
  return reason;
}

export async function enable(minutes: number | null): Promise<void> {
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
