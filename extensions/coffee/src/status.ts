import { getPreferenceValues, launchCommand, LaunchType, LocalStorage, updateCommandMetadata } from "@raycast/api";
import { execFileSync } from "node:child_process";
import {
  Schedule,
  startCaffeinate,
  getSchedule,
  stopCaffeinate,
  isCaffeinateRunning,
  getCaffeinationReason,
  formatDuration,
  deviceName,
} from "./utils";

const AUTO_CAFFEINATE_PID_KEY = "autoCaffeinateRaycastPid";
const SCHEDULE_MONITOR_LAST_RUN_KEY = "scheduleMonitorLastRun";
const SCHEDULE_MONITOR_STALE_AFTER_MS = 2 * 60 * 1000;

/** Opens the status command once so Raycast activates its recurring background refresh. */
export async function activateScheduleMonitor(returnToSchedule = false): Promise<boolean> {
  try {
    await launchCommand({
      name: "status",
      type: LaunchType.UserInitiated,
      context: { returnToSchedule },
    });
    return true;
  } catch (error) {
    console.error("Failed to launch the caffeination schedule monitor:", error);
    return false;
  }
}

export async function isScheduleMonitorActivated(): Promise<boolean> {
  const lastRun = await LocalStorage.getItem<number>(SCHEDULE_MONITOR_LAST_RUN_KEY);
  return typeof lastRun === "number" && Date.now() - lastRun <= SCHEDULE_MONITOR_STALE_AFTER_MS;
}

/**
 * Returns a session identifier for the currently-running Raycast instance.
 *
 * macOS: uses `lsappinfo` to query Raycast's start time via LaunchServices using
 * the bundle ID — immune to process-table visibility restrictions that cause
 * `pgrep` to return nothing from within the extension context.
 *
 * Windows: queries the Raycast.exe PID via `tasklist` — stable across the session
 * regardless of which process spawns the extension command.
 *
 * Fallback: `process.ppid` (the Raycast Helper PID) which is stable within a
 * session in production builds, though it may vary across commands in dev mode.
 */
function getRaycastSessionId(): string {
  if (process.platform === "win32") {
    try {
      const out = execFileSync("tasklist", ["/FI", "IMAGENAME eq Raycast.exe", "/FO", "CSV", "/NH"], {
        encoding: "utf8",
      }).trim();

      // CSV output: "Raycast.exe","12345","Console","1","12,452 K"
      const pidMatch = out.match(/"Raycast\.exe","(\d+)"/);
      if (pidMatch?.[1]) {
        return `pid:${pidMatch[1]}`;
      }
    } catch {
      // tasklist failed or Raycast not running — fall through.
    }
  } else {
    try {
      const out = execFileSync("/usr/bin/lsappinfo", ["info", "-app", "com.raycast.macos"], {
        encoding: "utf8",
      }).trim();

      const pidMatch = out.match(/pid\s*=\s*(\d+)/);
      if (pidMatch?.[1]) {
        return `pid:${pidMatch[1]}`;
      }

      const dateMatch = out.match(/\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}/);
      if (dateMatch?.[0]) {
        return `launch:${dateMatch[0]}`;
      }
    } catch {
      // lsappinfo unavailable or Raycast not registered yet — fall through.
    }
  }

  // Fallback: parent PID (stable in production on both platforms; may vary in dev).
  return `ppid:${process.ppid}`;
}

async function handleScheduledCaffeinate(schedule: Schedule): Promise<boolean> {
  if (!schedule || Object.keys(schedule).length === 0) {
    return false;
  }

  const currentDate = new Date();
  const [startHour, startMinute] = schedule.from.split(":").map(Number);
  const [endHour, endMinute] = schedule.to.split(":").map(Number);
  const currentHour = currentDate.getHours();
  const currentMinute = currentDate.getMinutes();

  const isWithinSchedule =
    (currentHour > startHour || (currentHour === startHour && currentMinute >= startMinute)) &&
    (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute));

  // Change isRunning to false when the schedule has finished its run
  if (isWithinSchedule === false && schedule.IsRunning === true) {
    schedule.IsRunning = false;
    await stopCaffeinate({ menubar: true, status: true });
    await LocalStorage.setItem(schedule.day, JSON.stringify(schedule));
    return false;
  }

  // If the current time is within scheduled time, start caffeination
  if (isWithinSchedule === true && schedule.IsRunning === false) {
    const endTime = new Date(currentDate);
    endTime.setHours(endHour, endMinute, 0, 0);
    const remainingSeconds = Math.ceil((endTime.getTime() - currentDate.getTime()) / 1000);

    await startCaffeinate({ menubar: true, status: true }, undefined, `-t ${remainingSeconds}`, {
      kind: "schedule",
      day: schedule.day,
      from: schedule.from,
      to: schedule.to,
    });
    schedule.IsRunning = true;
    await LocalStorage.setItem(schedule.day, JSON.stringify(schedule));
    return true;
  }

  return false;
}

// Function to check and handle schedule
export async function checkSchedule() {
  const schedule = await getSchedule();

  if (schedule === undefined) return false;

  if (!schedule.IsManuallyDecafed) {
    const isScheduled = await handleScheduledCaffeinate(schedule);
    return isScheduled;
  }

  return false;
}

/**
 * Starts caffeination (indefinitely) once per Raycast session when the
 * "Start caffeination when Raycast starts" preference is enabled and the
 * computer is not already caffeinated or covered by a schedule. Returns true when
 * caffeination was started.
 *
 * Session detection is keyed off the Raycast launch time stored in
 * LocalStorage. The session ID changes only when Raycast actually relaunches, so
 * sleep/wake cycles (where background intervals simply don't fire but the ID
 * stays the same) cannot trigger a spurious auto-caffeinate.
 */
export async function maybeAutoCaffeinate(isScheduled?: boolean): Promise<boolean> {
  const currentSessionId = getRaycastSessionId();
  const storedSessionId = await LocalStorage.getItem<string>(AUTO_CAFFEINATE_PID_KEY);

  // Always refresh the stored session ID so it reflects the running Raycast process.
  // This must happen before the early returns so that after a manual decaf the
  // marker stays current and won't look like a new session on the next tick.
  await LocalStorage.setItem(AUTO_CAFFEINATE_PID_KEY, currentSessionId);

  if (!getPreferenceValues<Preferences>().startCaffeinateOnLaunch) return false;
  if (await isCaffeinateRunning()) return false;

  const scheduled = isScheduled ?? (await checkSchedule());
  if (scheduled) return false;

  // A different (or absent) session ID means Raycast relaunched — treat as new session.
  // Sleep/wake does not change the session ID, so it cannot trigger a false positive.
  if (currentSessionId === storedSessionId) return false;

  await startCaffeinate({ menubar: true, status: true }, `Auto-caffeinating your ${deviceName()}`);
  return true;
}

export default async function Command(props: {
  launchContext?: { returnToSchedule?: boolean; skipScheduleMonitorHeartbeat?: boolean };
}) {
  if (!props.launchContext?.skipScheduleMonitorHeartbeat) {
    await LocalStorage.setItem(SCHEDULE_MONITOR_LAST_RUN_KEY, Date.now());
  }

  const isCaffeinated = await isCaffeinateRunning();
  const isScheduled = await checkSchedule();
  const autoStarted = await maybeAutoCaffeinate(isScheduled);

  let subtitle = "✖ Decaffeinated";

  if (isCaffeinated || isScheduled || autoStarted) {
    subtitle = "✓ Caffeinated";

    const reason = await getCaffeinationReason();
    if (reason?.kind === "while") {
      subtitle = `✓ Caffeinated (while ${reason.appName} is running)`;
    } else if (reason?.kind === "for") {
      const endsAt = new Date(reason.endsAt);
      const remainingSeconds = Math.floor((endsAt.getTime() - Date.now()) / 1000);
      if (!Number.isNaN(endsAt.getTime()) && remainingSeconds > 0) {
        subtitle = `✓ Caffeinated (${formatDuration(remainingSeconds)} left)`;
      }
    } else if (reason?.kind === "until") {
      const until = new Date(reason.until);
      if (!Number.isNaN(until.getTime()) && until.getTime() > Date.now()) {
        const time = until.toLocaleTimeString([], { timeStyle: "short" });
        const sameDay = until.toDateString() === new Date().toDateString();
        const label = sameDay ? time : `${until.toLocaleDateString([], { weekday: "short" })} ${time}`;
        subtitle = `✓ Caffeinated (until ${label})`;
      }
    } else if (reason?.kind === "schedule") {
      subtitle = `✓ Caffeinated (schedule: ${pluralDay(reason.day)} from ${reason.from} to ${reason.to})`;
    }
  }

  await updateCommandMetadata({ subtitle });

  if (props.launchContext?.returnToSchedule) {
    await launchCommand({ name: "addSchedule", type: LaunchType.UserInitiated });
  }
}

function pluralDay(day: string): string {
  const name = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
  return name.endsWith("s") ? name : `${name}s`;
}
