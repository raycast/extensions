import { getPreferenceValues } from "@raycast/api";
import { batchSync } from "./api/sync";
import { pushAlert, getPendingAlerts } from "./lib/alerts";
import { setCachedTaskCounts } from "./lib/menu-bar-cache";
import { tickPomodoro } from "./lib/pomodoro-engine";
import { isPast, parseISO } from "date-fns";
import { Task } from "./types/ticktick";

const LAST_CHECK_KEY = "ticktick_last_alert_check";

async function getLastCheck(): Promise<number> {
  const { LocalStorage } = await import("@raycast/api");
  const v = await LocalStorage.getItem<string>(LAST_CHECK_KEY);
  return v ? parseInt(v, 10) : 0;
}

async function setLastCheck(ts: number): Promise<void> {
  const { LocalStorage } = await import("@raycast/api");
  await LocalStorage.setItem(LAST_CHECK_KEY, String(ts));
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate) return false;
  try {
    return isPast(parseISO(task.dueDate));
  } catch {
    return false;
  }
}

/** Background command — checks pomodoro completion + overdue/urgent tasks. */
export default async function BackgroundCheck() {
  const prefs = getPreferenceValues<Preferences>();
  if (prefs.enableAlerts === false) return;

  // Always tick pomodoro (may complete and queue alert)
  await tickPomodoro();

  const lastCheck = await getLastCheck();
  const now = Date.now();
  // Only run task checks every 15 minutes to avoid hammering the API
  if (now - lastCheck < 15 * 60 * 1000) return;

  try {
    const sync = await batchSync();
    const tasks = (sync.syncTaskBean?.update ?? []).filter((t) => t.deleted !== 1 && t.status !== 2);

    const overdue = prefs.alertOverdue !== false ? tasks.filter(isOverdue) : [];
    const urgent = prefs.alertUrgent !== false ? tasks.filter((t) => t.priority >= 5) : [];

    // Cache counts for lightweight menu bar reads
    await setCachedTaskCounts({ overdue: overdue.length, urgent: urgent.length });

    const existing = await getPendingAlerts();
    const existingTitles = new Set(existing.map((a) => a.title));

    if (overdue.length > 0) {
      const title = `⚠️ ${overdue.length} overdue task${overdue.length !== 1 ? "s" : ""}`;
      if (!existingTitles.has(title)) {
        await pushAlert({
          type: "overdue",
          title,
          message: overdue
            .slice(0, 3)
            .map((t) => t.title)
            .join(", "),
        });
      }
    }

    if (urgent.length > 0) {
      const title = `🔴 ${urgent.length} urgent task${urgent.length !== 1 ? "s" : ""}`;
      if (!existingTitles.has(title)) {
        await pushAlert({
          type: "urgent",
          title,
          message: urgent
            .slice(0, 3)
            .map((t) => t.title)
            .join(", "),
        });
      }
    }

    await setLastCheck(now);
  } catch {
    // network/auth error — skip silently
  }
}
