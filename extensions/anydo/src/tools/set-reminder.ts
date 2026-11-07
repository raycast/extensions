import { makeClient } from "../anydo/auth";
import { toLocalIso } from "../anydo/format";
import { dueLabel, findTask } from "../anydo/match";
import { describeParse, parseTaskText } from "../anydo/parse";

type Input = {
  /** عنوان (یا بخشی از عنوان) یا شناسه‌ی تسک */
  task: string;
  /** زمان یادآور به هر شکل: «۱۹:۰۰»، «فردا ساعت ۹ صبح»، «۱۴۰۵/۰۸/۱۵»، «۳ روز دیگر» */
  when: string;
  /** تکرار یادآور: day، week، month یا year (اختیاری) */
  repeat?: "day" | "week" | "month" | "year";
};

const RECURRENCE = {
  day: "TASK_REPEAT_DAY",
  week: "TASK_REPEAT_WEEK",
  month: "TASK_REPEAT_MONTH",
  year: "TASK_REPEAT_YEAR",
} as const;

/** Confirms the reminder that is about to be set. */
export const confirmation = (input: Input) => {
  const parsed = parseTaskText(input.when);
  return {
    message: `برای تسک «${input.task}» یادآور تنظیم شود؟`,
    info: [
      {
        name: "زمان",
        value: parsed.date ? describeParse(parsed) : `«${input.when}» (نامشخص)`,
      },
      { name: "تکرار", value: input.repeat ?? "بدون تکرار" },
    ],
  };
};

/** Sets (or replaces) the due date and reminder of an Any.do task. */
export default async function tool({ task, when, repeat }: Input) {
  const client = makeClient();
  const tasks = await client.getAllTasks();
  const found = findTask(tasks, task);
  if (!found) throw new Error(`تسکی با «${task}» پیدا نشد.`);

  const parsed = parseTaskText(when);
  if (!parsed.date) throw new Error(`زمان «${when}» قابل تشخیص نبود.`);

  const local = toLocalIso(parsed.date);
  if (repeat) {
    await client.setRecurringReminder(found, local, RECURRENCE[repeat]);
  } else {
    await client.setReminder(found, local);
  }

  return {
    updated: true,
    id: found.task_id,
    title: found.title,
    previousDue: dueLabel(found),
    due: describeParse(parsed),
    repeat: repeat ?? null,
  };
}
