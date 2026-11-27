import { makeClient } from "../anydo/auth";
import {
  byDueThenTitle,
  dueLabel,
  isOverdue,
  listTitleOf,
  taskMatches,
  withinWindow,
  type DueWindow,
} from "../anydo/match";

type Input = {
  /** متن برای جست‌وجو در عنوان و نوت تسک‌ها (اختیاری) */
  query?: string;
  /** بازه‌ی زمانی: today، tomorrow، week، overdue یا all */
  when?: DueWindow;
  /** عنوان لیست Any.do برای فیلتر کردن (اختیاری) */
  list?: string;
};

/** Searches the user's open Any.do tasks. */
export default async function tool({ query, when = "all", list }: Input) {
  const client = makeClient();
  const [lists, tasks] = await Promise.all([
    client.getLists(),
    client.getAllTasks(),
  ]);
  const now = new Date();
  const wantedList = list
    ? lists.find((entry) => entry.title === list || entry.title.includes(list))
    : undefined;

  const rows = tasks
    .filter((task) => task.status === "unchecked")
    .filter((task) => !wantedList || task.list_id === wantedList.list_id)
    .filter((task) => !query || taskMatches(task, query))
    .filter((task) => withinWindow(task, when, now))
    .sort(byDueThenTitle)
    .map((task) => ({
      id: task.task_id,
      title: task.title,
      list: listTitleOf(lists, task.list_id),
      due: dueLabel(task) ?? "بدون تاریخ",
      overdue: isOverdue(task, now),
      note: task.note ?? undefined,
    }));

  return {
    count: rows.length,
    filter: { query: query ?? null, when, list: wantedList?.title ?? null },
    tasks: rows,
  };
}
