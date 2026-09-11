import { Alert, LaunchProps, closeMainWindow, confirmAlert, open } from "@raycast/api";
import { appendFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import { saveActiveSession } from "./lib/watcher-store";

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

export default async function ConfirmFocus(props: LaunchProps<{ arguments: Args; launchContext: Context }>) {
  const { title, duration, categories } = props.arguments;
  const ctx = props.launchContext ?? {};
  const eventId = ctx.eventId ?? "manual-test";
  const logPath = ctx.logPath ?? "";
  const timeoutMs = Math.max(1, Number.parseInt(ctx.timeoutSeconds ?? "30", 10)) * 1000;
  const startDate = ctx.startIso ? new Date(ctx.startIso) : new Date();
  const invokedAt = Date.now();

  const durationSeconds = Number.parseInt(duration, 10);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    console.error(`[confirm-focus] Invalid duration: "${duration}"`);
    return;
  }
  const durationMinutes = Math.round(durationSeconds / 60);

  const timeoutPromise = new Promise<typeof TIMED_OUT>((resolve) => setTimeout(() => resolve(TIMED_OUT), timeoutMs));
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
    appendLog(logPath, "SKIPPED_USER_TIMEOUT", eventId, title, startDate, durationMinutes);
    await closeMainWindow();
    return;
  }

  if (result === true) {
    const elapsedMs = Date.now() - invokedAt;
    if (elapsedMs > timeoutMs) {
      appendLog(logPath, "SKIPPED_STALE_YES", eventId, title, startDate, durationMinutes);
      await closeMainWindow();
      return;
    }
    const goal = encodeURIComponent(title);
    const cats = categories ? `&categories=${encodeURIComponent(categories)}` : "";
    const focusUrl = `raycast://focus/start?goal=${goal}&duration=${durationSeconds}${cats}`;
    try {
      try {
        await open("raycast://focus/complete");
      } catch (e) {
        console.warn(`[confirm-focus] focus/stop deeplink failed (continuing): ${e}`);
      }
      await open(focusUrl);
      const endIso = new Date(Date.now() + durationSeconds * 1000).toISOString();
      await saveActiveSession({ eventId, endIso });
      appendLog(logPath, "TRIGGERED", eventId, title, startDate, durationMinutes);
    } catch (e) {
      console.error(`[confirm-focus] Failed to fire focus deeplink: ${e}`);
      appendLog(logPath, "TRIGGER_FAILED", eventId, title, startDate, durationMinutes);
    }
    await closeMainWindow();
  } else {
    appendLog(logPath, "SKIPPED_USER_DECLINED", eventId, title, startDate, durationMinutes);
    await closeMainWindow();
  }
}

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
