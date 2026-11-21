import { makeClient } from "../anydo/auth";
import { dueLabel, findTask, listTitleOf } from "../anydo/match";

type Input = {
  /** عنوان (یا بخشی از عنوان) یا شناسه‌ی تسکی که انجام شده است */
  task: string;
};

/** Confirms which task is about to be completed. */
export const confirmation = (input: Input) => ({
  message: `تسک «${input.task}» در Any.do به‌عنوان انجام‌شده علامت بخورد؟`,
});

/** Marks an Any.do task as done. */
export default async function tool({ task }: Input) {
  const client = makeClient();
  const [lists, tasks] = await Promise.all([
    client.getLists(),
    client.getAllTasks(),
  ]);
  const found = findTask(tasks, task);
  if (!found) throw new Error(`تسکی با «${task}» پیدا نشد.`);

  await client.setStatus(found, "checked");
  return {
    completed: true,
    id: found.task_id,
    title: found.title,
    list: listTitleOf(lists, found.list_id),
    due: dueLabel(found),
  };
}
