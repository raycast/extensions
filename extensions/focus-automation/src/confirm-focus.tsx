import {
  Alert,
  LaunchProps,
  closeMainWindow,
  confirmAlert,
  open,
} from "@raycast/api";
import { appendFileSync, mkdirSync } from "fs";
import { dirname } from "path";

type Args = {
  title: string;
  duration: string;
  categories?: string;
};

type Context = {
  eventId?: string;
  logPath?: string;
  timeoutSeconds?: string;
  startIso?: string;
};

const TIMED_OUT = Symbol("TIMED_OUT");

export default async function ConfirmFocus(
  props: LaunchProps<{ arguments: Args; launchContext: Context }>,
) {
  const { title, duration, categories } = props.arguments;
  const ctx = props.launchContext ?? {};
  const eventId = ctx.eventId ?? "manual-test";
  const logPath = ctx.logPath ?? "";
  const timeoutMs =
    Math.max(1, Number.parseInt(ctx.timeoutSeconds ?? "30", 10)) * 1000;
  const startDate = ctx.startIso ? new Date(ctx.startIso) : new Date();
  // Reference clock for the stale-yes guard. Captures when this command
  // started executing, not the event's calendar start time — so a late daemon
  // fire (e.g. after macOS sleep/wake) doesn't falsely trip the guard when the
  // user clicks Start promptly. See decisions.md 2026-05-22 (stale-yes fix).
  const invokedAt = Date.now();

  const durationSeconds = Number.parseInt(duration, 10);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    console.error(`[confirm-focus] Invalid duration: "${duration}"`);
    return;
  }
  const durationMinutes = Math.round(durationSeconds / 60);

  // Race confirmAlert against the configured timeout. Default-to-Skip on timeout
  // matches the locked decision (decisions.md 2026-04-22).
  const timeoutPromise = new Promise<typeof TIMED_OUT>((resolve) =>
    setTimeout(() => resolve(TIMED_OUT), timeoutMs),
  );
  const alertPromise = confirmAlert({
    title,
    message: `Start a Focus session? ${durationMinutes} min`,
    primaryAction: {
      title: "Start Focus",
      style: Alert.ActionStyle.Default,
    },
    dismissAction: {
      title: "Skip",
      style: Alert.ActionStyle.Cancel,
    },
  });
  const result = await Promise.race([alertPromise, timeoutPromise]);

  if (result === TIMED_OUT) {
    appendLog(
      logPath,
      "SKIPPED_USER_TIMEOUT",
      eventId,
      title,
      startDate,
      durationMinutes,
    );
    // Promise.race doesn't cancel confirmAlert — the modal stays on screen until
    // the user clicks something. Force-dismiss the Raycast UI so it disappears.
    await closeMainWindow();
    return;
  }

  if (result === true) {
    // Stale-launch guard: catches the case where the modal was queued while
    // Raycast was backgrounded and the user clicks Yes long after the timeout
    // window. Compared against `invokedAt` (when this command started), NOT
    // the event's calendar start time — otherwise a daemon late-fire after
    // macOS sleep/wake would falsely reject a prompt click.
    const elapsedMs = Date.now() - invokedAt;
    if (elapsedMs > timeoutMs) {
      appendLog(
        logPath,
        "SKIPPED_STALE_YES",
        eventId,
        title,
        startDate,
        durationMinutes,
      );
      await closeMainWindow();
      return;
    }
    const goal = encodeURIComponent(title);
    const cats = categories
      ? `&categories=${encodeURIComponent(categories)}`
      : "";
    const focusUrl = `raycast://focus/start?goal=${goal}&duration=${durationSeconds}${cats}`;
    try {
      // Idempotent: stop any running Focus session before starting a new one.
      // Raycast no-ops if nothing is active. Failure to stop must not block the start.
      try {
        await open("raycast://focus/complete");
      } catch (e) {
        console.warn(
          `[confirm-focus] focus/stop deeplink failed (continuing): ${e}`,
        );
      }
      await open(focusUrl);
      appendLog(
        logPath,
        "TRIGGERED",
        eventId,
        title,
        startDate,
        durationMinutes,
      );
    } catch (e) {
      console.error(`[confirm-focus] Failed to fire focus deeplink: ${e}`);
      appendLog(
        logPath,
        "TRIGGER_FAILED",
        eventId,
        title,
        startDate,
        durationMinutes,
      );
    }
    // Close the Raycast launcher so the user isn't left with it visible
    // after the modal resolves. Matches the timeout/stale-yes branches above.
    await closeMainWindow();
  } else {
    appendLog(
      logPath,
      "SKIPPED_USER_DECLINED",
      eventId,
      title,
      startDate,
      durationMinutes,
    );
    await closeMainWindow();
  }
}

// Match Python's logger format exactly so `grep <event_id> logs/*.log` works
// across both files.
//   [2026-04-27 17:32:32] TRIGGERED                  event_id="..." title="..." start="HH:MM" duration=Nmin
function appendLog(
  logPath: string,
  action: string,
  eventId: string,
  title: string,
  startDate: Date,
  durationMin: number,
) {
  if (!logPath) {
    console.warn("[confirm-focus] No logPath in context, skipping file log");
    return;
  }
  const now = new Date();
  const ts = formatTimestamp(now);
  const startStr = formatHHMM(startDate);
  const line = `[${ts}] ${action.padEnd(26)} event_id="${eventId}" title="${title}" start="${startStr}" duration=${durationMin}min\n`;
  try {
    mkdirSync(dirname(logPath), { recursive: true });
    appendFileSync(logPath, line);
  } catch (e) {
    console.error(`[confirm-focus] Could not write to log file: ${e}`);
  }
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatTimestamp(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatHHMM(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
