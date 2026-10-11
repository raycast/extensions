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

export async function refreshMenuBar(): Promise<void> {
  try {
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  } catch {
    // Menu bar command not enabled yet; nothing to refresh.
  }
}

export async function enable(minutes: number | null): Promise<void> {
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
  await refreshMenuBar();
}

export async function disable(options: { allowPrompt?: boolean } = { allowPrompt: true }): Promise<void> {
  await setSleepDisabled(false, { allowPrompt: options.allowPrompt });
  await clearSession();
  await refreshMenuBar();
}

export async function getStatus(): Promise<Status> {
  // Read the session first: enable turns sleep on before saving, so a session seen here means sleep is already on.
  let session = await readSession();
  const on = await isSleepDisabled();
  if (!on && session) {
    await clearSession();
    session = null;
  }
  const battery = await getBattery();
  return { on, session, battery };
}

export async function enforce(): Promise<AutoDisableReason | null> {
  const status = await getStatus();
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
  if (reason) {
    // The user may have started a new session while this check ran; leave that one alone.
    const current = await readSession();
    if (!current || current.startedAt !== status.session.startedAt) {
      return null;
    }
    await disable({ allowPrompt: false });
    return reason;
  }
  return null;
}
