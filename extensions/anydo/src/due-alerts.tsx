import { LocalStorage, updateCommandMetadata } from "@raycast/api";

import {
  alertSentToTelegram,
  alertTasks,
  loadCache,
  markAlertSentToTelegram,
  markTelegramSent,
  markWeeklySent,
  saveCache,
  telegramLastSent,
  weeklyLastSent,
} from "./anydo/alarm";
import { NotSignedInError, makeClient } from "./anydo/auth";
import { isoDay } from "./anydo/dates";
import { dueDate } from "./anydo/format";
import { aiAvailable } from "./anydo/ai-analyze";
import { loadCompleted } from "./anydo/history";
import { writeMonthlyArchive } from "./anydo/journal";
import { listTitleOf } from "./anydo/match";
import { t } from "./anydo/i18n";
import { toPersianDigits } from "./anydo/jalali";
import { writeDailySummary } from "./anydo/journal";
import { withinWindow } from "./anydo/match";
import {
  alertEnabled,
  alertLeadMinutes,
  dailyLogEnabled,
  dailyLogTime,
  monthlyArchiveDay,
  monthlyArchiveEnabled,
  prefs,
  telegramDueAlertsEnabled,
  weeklyDay,
  weeklyTelegramEnabled,
  weeklyTime,
} from "./anydo/prefs";
import {
  buildDailySummary,
  buildDueAlert,
  buildWeeklySummary,
  sendTelegram,
} from "./anydo/telegram";

const MONTHLY_ARCHIVE_KEY = "anydo:monthly-archive";

const NEAR_WINDOW_MS = 60 * 60 * 1000;
const FAST_REFRESH_MS = 60 * 1000;
const SLOW_REFRESH_MS = 10 * 60 * 1000;

function parseClock(
  raw: string,
  fallbackHour: number,
): { hours: number; minutes: number } {
  const match = raw.match(/^(\d{1,2})\s*[:.]\s*(\d{1,2})$/);
  if (!match) return { hours: fallbackHour, minutes: 0 };
  return {
    hours: Math.min(23, Number(match[1])),
    minutes: Math.min(59, Number(match[2])),
  };
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** Saturday = 0 … Friday = 6 (JS getDay: Sunday = 0). */
function persianWeekday(date: Date): number {
  return (date.getDay() + 1) % 7;
}

/**
 * Runs every minute in the background. The task list is cached and only refreshed when it matters
 * (every minute while a task is close, otherwise every 10 minutes). It also raises the lead/due
 * alerts and sends the optional daily, weekly and end-of-day digests.
 */
export default async function DueAlerts() {
  try {
    const client = makeClient();
    const settings = prefs();
    const now = new Date();

    const cache = await loadCache();
    const cachedTasks = cache?.tasks ?? [];
    const nextDue = cachedTasks
      .filter((task) => task.status === "unchecked")
      .map((task) => dueDate(task)?.getTime())
      .filter((value): value is number => typeof value === "number")
      .sort((left, right) => left - right)[0];

    const near =
      typeof nextDue === "number" && nextDue - now.getTime() <= NEAR_WINDOW_MS;
    const age = cache ? now.getTime() - cache.at : Number.POSITIVE_INFINITY;
    const mustRefresh = age > (near ? FAST_REFRESH_MS : SLOW_REFRESH_MS);

    const tasks = mustRefresh ? await client.getAllTasks() : cachedTasks;
    if (mustRefresh) await saveCache(tasks);

    // One diagnostic line per day so it is obvious from the log whether Raycast AI is usable.
    const aiLogKey = "anydo:ai-log";
    if ((await LocalStorage.getItem<string>(aiLogKey)) !== isoDay(now)) {
      await LocalStorage.setItem(aiLogKey, isoDay(now));
      console.log(
        `[anydo] raycast-ai=${aiAvailable() ? "available" : "unavailable"}`,
      );
    }

    const open = tasks.filter((task) => task.status === "unchecked");
    const announcements = await alertTasks(open, now, alertEnabled());

    let telegramNote = "";
    const hasTelegram = Boolean(
      settings.telegramToken && settings.telegramChatId,
    );
    const overdue = open.filter((task) => withinWindow(task, "overdue", now));

    // --- instant alert in telegram when a task reaches its due (or lead) time ----
    let alertCount = 0;
    if (telegramDueAlertsEnabled() && hasTelegram && announcements.length > 0) {
      const lists = await client.getLists();
      for (const { task, kind } of announcements) {
        const key = `${task.task_id}:${kind}`;
        if (await alertSentToTelegram(key)) continue;
        const due = dueDate(task);
        const minutesAway = due
          ? Math.round((due.getTime() - now.getTime()) / 60_000)
          : alertLeadMinutes();
        const ok = await sendTelegram(
          buildDueAlert(
            task,
            listTitleOf(lists, task.list_id),
            kind,
            kind === "lead" ? Math.max(0, minutesAway) : 0,
            now,
          ),
        );
        if (ok) {
          await markAlertSentToTelegram(key);
          alertCount += 1;
        }
      }
      if (alertCount > 0)
        telegramNote += ` · ⚡ ${t("هشدار تلگرام", "telegram alert")}`;
    }

    // --- daily digest ----------------------------------------------------------
    if (settings.telegramEnabled && hasTelegram) {
      const { hours, minutes } = parseClock(
        settings.telegramTime ?? "08:00",
        8,
      );
      const target = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours,
        minutes,
        0,
        0,
      );
      const today = dayKey(now);
      if (
        now.getTime() >= target.getTime() &&
        (await telegramLastSent()) !== today
      ) {
        const todayTasks = open.filter((task) =>
          withinWindow(task, "today", now),
        );
        if (
          await sendTelegram(
            buildDailySummary(todayTasks, overdue, open.length),
          )
        ) {
          await markTelegramSent(today);
          telegramNote = ` · ${t("تلگرام ✓", "telegram ✓")}`;
        }
      }
    }

    // --- weekly report ---------------------------------------------------------
    if (weeklyTelegramEnabled() && hasTelegram) {
      const { hours, minutes } = parseClock(weeklyTime(), 20);
      const target = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours,
        minutes,
        0,
        0,
      );
      const weekday = persianWeekday(now);
      if (weekday === weeklyDay() && now.getTime() >= target.getTime()) {
        const anchor = new Date(now);
        anchor.setDate(anchor.getDate() - weekday);
        const weekKey = isoDay(anchor);
        if ((await weeklyLastSent()) !== weekKey) {
          const entries = await loadCompleted();
          const weekStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 6,
            0,
            0,
            0,
            0,
          );
          const completedThisWeek = entries.filter(
            (entry) => entry.at >= weekStart.getTime(),
          );
          if (
            await sendTelegram(
              buildWeeklySummary(completedThisWeek, open, overdue, weekStart),
            )
          ) {
            await markWeeklySent(weekKey);
            telegramNote = ` · ${t("گزارش هفتگی ✓", "weekly ✓")}`;
          }
        }
      }
    }

    // --- end-of-day summary file ----------------------------------------------
    let dailyNote = "";
    if (dailyLogEnabled()) {
      const { hours, minutes } = parseClock(dailyLogTime(), 22);
      const target = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours,
        minutes,
        0,
        0,
      );
      if (now.getTime() >= target.getTime()) {
        const entries = await loadCompleted();
        const todayStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        ).getTime();
        const completedToday = entries.filter(
          (entry) => entry.at >= todayStart,
        );
        if (await writeDailySummary({ open, overdue, completedToday, now })) {
          dailyNote = ` · ${t("خلاصه‌ی روز ✓", "daily ✓")}`;
        }
      }
    }

    // --- automatic monthly archive ---------------------------------------------
    let archiveNote = "";
    if (monthlyArchiveEnabled() && now.getDate() === monthlyArchiveDay()) {
      const key = `archive:${now.getFullYear()}-${now.getMonth()}`;
      if ((await LocalStorage.getItem<string>(MONTHLY_ARCHIVE_KEY)) !== key) {
        const archive = await writeMonthlyArchive({
          entries: await loadCompleted(),
          lists: await client.getLists(),
          monthStart: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          now,
        });
        if (archive) {
          await LocalStorage.setItem(MONTHLY_ARCHIVE_KEY, key);
          archiveNote = ` · ${t("آرشیو ماهانه ✓", "archive ✓")}`;
        }
      }
    }

    const todayCount = open.filter((task) =>
      withinWindow(task, "today", now),
    ).length;
    const alerts =
      announcements.length > 0
        ? ` · ${t("هشدار", "alerts")} ${toPersianDigits(announcements.length)}`
        : "";

    await updateCommandMetadata({
      subtitle: `${t("امروز", "today")} ${toPersianDigits(todayCount)} · ${t("عقب‌افتاده", "overdue")} ${toPersianDigits(
        overdue.length,
      )}${alerts}${telegramNote}${dailyNote}${archiveNote}`,
    });
  } catch (error) {
    if (error instanceof NotSignedInError) {
      await updateCommandMetadata({
        subtitle: t("به Any.do وارد نشده‌اید", "not signed in"),
      });
      return;
    }
    await updateCommandMetadata({
      subtitle: `${t("خطا", "error")}: ${error instanceof Error ? error.message.slice(0, 60) : "?"}`,
    });
  }
}
