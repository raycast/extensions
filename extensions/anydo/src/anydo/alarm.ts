import { execFile } from "child_process";

import { LocalStorage } from "@raycast/api";

import { relativeLabel } from "./dates";
import { dueDate } from "./format";
import { t } from "./i18n";
import {
  alertLeadMinutes,
  alertSoundFile,
  alertSoundKind,
  type SoundKind,
} from "./prefs";
import type { AnyDoTask } from "./types";

const ALERTED_KEY = "anydo:alerted";
const CACHE_KEY = "anydo:task-cache";
const TELEGRAM_SENT_KEY = "anydo:telegram-last";
const TELEGRAM_ALERT_KEY = "anydo:telegram-alerts";
const WEEKLY_SENT_KEY = "anydo:weekly-last";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/**
 * Toast notifications need a registered AppUserModelID. The PowerShell one ships with
 * Windows and is the usual trick for showing a toast from a script.
 */
const POWERSHELL_AUMID =
  "{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe";

const SOUND_EVENTS: Record<Exclude<SoundKind, "silent">, string> = {
  default: "ms-winsoundevent:Notification.Default",
  reminder: "ms-winsoundevent:Notification.Reminder",
  im: "ms-winsoundevent:Notification.IM",
  mail: "ms-winsoundevent:Notification.Mail",
  alarm: "ms-winsoundevent:Alarm.Alarm2",
};

const TOAST_SCRIPT = `
$ErrorActionPreference = 'Stop'
if ($env:ANYDO_TOAST_FILE) { try { (New-Object System.Media.SoundPlayer $env:ANYDO_TOAST_FILE).Play() } catch { } }
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType=WindowsRuntime] | Out-Null
$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml($env:ANYDO_TOAST_XML)
$toast = New-Object Windows.UI.Notifications.ToastNotification $xml
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($env:ANYDO_TOAST_AUMID).Show($toast)
`;

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Shows a Windows toast notification with the sound chosen in the preferences. */
export function showToastNotification(
  title: string,
  body: string,
  withSound = true,
): Promise<boolean> {
  return new Promise((resolve) => {
    if (process.platform !== "win32") {
      resolve(false);
      return;
    }

    const kind = alertSoundKind();
    const audio =
      withSound && kind !== "silent"
        ? `<audio src='${SOUND_EVENTS[kind]}' loop='false'/>`
        : "";
    const xml = `<toast><visual><binding template='ToastGeneric'><text>${escapeXml(title)}</text><text>${escapeXml(
      body,
    )}</text></binding></visual>${audio}</toast>`;

    const file = withSound ? alertSoundFile() : null;
    const child = execFile(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        TOAST_SCRIPT,
      ],
      {
        env: {
          ...process.env,
          ANYDO_TOAST_XML: xml,
          ANYDO_TOAST_AUMID: POWERSHELL_AUMID,
          ...(file ? { ANYDO_TOAST_FILE: file } : {}),
        },
        windowsHide: true,
      },
      (error) => resolve(!error),
    );
    child.on("error", () => resolve(false));
  });
}

// --- task cache (keeps the 1-minute loop from hammering the API) ------------

export interface TaskCache {
  at: number;
  tasks: AnyDoTask[];
}

export async function loadCache(): Promise<TaskCache | null> {
  const raw = await LocalStorage.getItem<string>(CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TaskCache;
    return parsed && Array.isArray(parsed.tasks) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveCache(tasks: AnyDoTask[]): Promise<void> {
  const payload: TaskCache = { at: Date.now(), tasks };
  await LocalStorage.setItem(CACHE_KEY, JSON.stringify(payload));
}

// --- alerts -----------------------------------------------------------------

type Alerted = Record<string, number>;

async function loadAlerted(): Promise<Alerted> {
  const raw = await LocalStorage.getItem<string>(ALERTED_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Alerted;
    const cutoff = Date.now() - MAX_AGE_MS;
    return Object.fromEntries(
      Object.entries(parsed).filter(([, at]) => Number(at) > cutoff),
    );
  } catch {
    return {};
  }
}

async function saveAlerted(alerted: Alerted): Promise<void> {
  await LocalStorage.setItem(ALERTED_KEY, JSON.stringify(alerted));
}

export interface Announcement {
  task: AnyDoTask;
  kind: "lead" | "due";
}

/** Raises a lead alert (N minutes before) and the due alert, once per task each. */
export async function alertTasks(
  tasks: AnyDoTask[],
  now: Date = new Date(),
  notify = true,
): Promise<Announcement[]> {
  const lead = alertLeadMinutes();
  const alerted = await loadAlerted();
  const announcements: Announcement[] = [];
  let dirty = false;

  for (const task of tasks) {
    if (task.status !== "unchecked") continue;
    const due = dueDate(task);
    if (!due) continue;

    const dueMs = due.getTime();
    const leadKey = `${task.task_id}:lead`;
    const dueKey = `${task.task_id}:due`;

    if (
      lead > 0 &&
      now.getTime() >= dueMs - lead * 60_000 &&
      now.getTime() < dueMs &&
      !alerted[leadKey]
    ) {
      const ok = notify
        ? await showToastNotification(
            t(`⏰ ${lead} دقیقه تا سررسید`, `⏰ Due in ${lead} minutes`),
            `${task.title}\n${relativeLabel(due, now)}`,
            true,
          )
        : true;
      if (ok || process.platform !== "win32") {
        alerted[leadKey] = now.getTime();
        dirty = true;
      }
      announcements.push({ task, kind: "lead" });
    }

    if (now.getTime() >= dueMs && !alerted[dueKey]) {
      const ok = notify
        ? await showToastNotification(
            t("⏰ زمان تسک رسید", "⏰ Task is due"),
            task.title,
            true,
          )
        : true;
      if (ok || process.platform !== "win32") {
        alerted[dueKey] = now.getTime();
        dirty = true;
      }
      announcements.push({ task, kind: "due" });
    }
  }

  if (dirty) await saveAlerted(alerted);
  return announcements;
}

// --- telegram bookkeeping ---------------------------------------------------

export async function telegramLastSent(): Promise<string | null> {
  return (await LocalStorage.getItem<string>(TELEGRAM_SENT_KEY)) ?? null;
}

export async function markTelegramSent(dayKey: string): Promise<void> {
  await LocalStorage.setItem(TELEGRAM_SENT_KEY, dayKey);
}

export async function weeklyLastSent(): Promise<string | null> {
  return (await LocalStorage.getItem<string>(WEEKLY_SENT_KEY)) ?? null;
}

export async function markWeeklySent(weekKey: string): Promise<void> {
  await LocalStorage.setItem(WEEKLY_SENT_KEY, weekKey);
}

/**
 * Telegram alerts are tracked per task *and* per kind, so a task that is due can send both a lead
 * alert and a due alert, and neither is ever repeated (even if the Windows toast failed).
 */
export async function alertSentToTelegram(key: string): Promise<boolean> {
  const raw = await LocalStorage.getItem<string>(TELEGRAM_ALERT_KEY);
  if (!raw) return false;
  try {
    const map = JSON.parse(raw) as Record<string, number>;
    return typeof map[key] === "number";
  } catch {
    return false;
  }
}

export async function markAlertSentToTelegram(key: string): Promise<void> {
  const raw = await LocalStorage.getItem<string>(TELEGRAM_ALERT_KEY);
  let map: Record<string, number> = {};
  try {
    map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    map = {};
  }
  map[key] = Date.now();
  // keep the map bounded — anything older than 30 days is irrelevant
  const cutoff = Date.now() - 30 * 86_400_000;
  for (const [entry, at] of Object.entries(map)) {
    if (at < cutoff) delete map[entry];
  }
  await LocalStorage.setItem(TELEGRAM_ALERT_KEY, JSON.stringify(map));
}
