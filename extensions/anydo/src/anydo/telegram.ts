import { formatDueUi, relativeLabel } from "./dates";
import { dueDate } from "./format";
import type { CompletedEntry } from "./history";
import { formatJalaliDate, toPersianDigits } from "./jalali";
import { prefs } from "./prefs";
import { parseNote, priorityLabel } from "./tags";
import type { AnyDoTask } from "./types";

/** Sends a message through the user's own bot (token + chat id come from preferences). */
export async function sendTelegram(html: string): Promise<boolean> {
  const { telegramToken, telegramChatId } = prefs();
  if (!telegramToken || !telegramChatId) return false;
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${telegramToken.trim()}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramChatId.trim(),
          text: html,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}

function line(task: AnyDoTask): string {
  const due = dueDate(task);
  const when = due
    ? ` — <i>${formatDueUi(due, Boolean(task.datetime))}</i>`
    : "";
  return `• ${task.title}${when}`;
}

/** Morning digest: today's tasks plus everything overdue. */
export function buildDailySummary(
  today: AnyDoTask[],
  overdue: AnyDoTask[],
  openCount: number,
): string {
  const parts = ["<b>☀️ برنامه‌ی امروز — Any.do</b>"];
  parts.push(`\n<b>امروز (${toPersianDigits(today.length)})</b>`);
  parts.push(
    today.length > 0 ? today.map(line).join("\n") : "— چیزی برای امروز نیست",
  );
  if (overdue.length > 0) {
    parts.push(`\n<b>عقب‌افتاده (${toPersianDigits(overdue.length)})</b>`);
    parts.push(overdue.map(line).join("\n"));
  }
  parts.push(`\n<i>مجموع تسک‌های باز: ${toPersianDigits(openCount)}</i>`);
  return parts.join("\n");
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Instant alert when a task reaches its due time (or the lead time before it). */
export function buildDueAlert(
  task: AnyDoTask,
  listTitle: string,
  kind: "lead" | "due",
  minutesAway: number,
  now: Date = new Date(),
): string {
  const due = dueDate(task);
  const meta = parseNote(task.note);
  const head =
    kind === "due"
      ? "⏰ <b>زمان انجام رسید!</b>"
      : `⏳ <b>${toPersianDigits(Math.max(0, Math.round(minutesAway)))} دقیقه تا موعد</b>`;
  const parts = [head, "", `📝 <b>${esc(task.title)}</b>`];
  if (due)
    parts.push(
      `📅 <i>${esc(formatDueUi(due, Boolean(task.datetime)))}</i> · ${esc(relativeLabel(due, now))}`,
    );
  if (listTitle) parts.push(`📁 ${esc(listTitle)}`);
  if (meta.priority > 0) parts.push(`🚩 ${esc(priorityLabel(meta.priority))}`);
  if (meta.tags.length > 0)
    parts.push(`🏷 ${meta.tags.map((tag) => `#${esc(tag)}`).join(" ")}`);
  if (meta.text) parts.push("", esc(meta.text));
  parts.push("", "<i>Any.do · Raycast</i>");
  return parts.join("\n");
}

/** Weekly report: how much was finished, and what is still open. */
export function buildWeeklySummary(
  completed: CompletedEntry[],
  open: AnyDoTask[],
  overdue: AnyDoTask[],
  weekStart: Date,
): string {
  const days: string[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const day = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() + offset,
    );
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    const count = completed.filter(
      (entry) => entry.at >= day.getTime() && entry.at < next.getTime(),
    ).length;
    const bar = "▇".repeat(Math.min(count, 10)) || "·";
    days.push(`${formatJalaliDate(day)}: ${bar} ${toPersianDigits(count)}`);
  }

  const parts = ["<b>📊 گزارش هفتگی — Any.do</b>"];
  parts.push(
    `\n<b>انجام‌شده‌ها در این هفته: ${toPersianDigits(completed.length)}</b>`,
  );
  parts.push(`<code>${days.join("\n")}</code>`);
  parts.push(`\n<b>تسک‌های باز: ${toPersianDigits(open.length)}</b>`);
  if (overdue.length > 0) {
    parts.push(`<b>عقب‌افتاده (${toPersianDigits(overdue.length)})</b>`);
    parts.push(overdue.slice(0, 10).map(line).join("\n"));
  }
  const top = completed
    .slice(-8)
    .reverse()
    .map((entry) => `• ${entry.title}`)
    .join("\n");
  if (top) parts.push(`\n<b>آخرین کارهای تمام‌شده</b>\n${top}`);
  return parts.join("\n");
}
