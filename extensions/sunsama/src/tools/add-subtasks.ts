import { addSubtasks } from "../lib/sunsama-client";

type Input = {
  /** The task id, from get-tasks. */
  taskId: string;
  /** Subtask titles to add, in order. */
  subtasks: string[];
};

/** Add subtasks to an existing task. */
export default async function tool(input: Input) {
  const titles = input.subtasks.map((s) => s.trim()).filter(Boolean);
  if (titles.length === 0) throw new Error("Give at least one subtask.");

  await addSubtasks(
    input.taskId,
    titles.map((title) => ({ title })),
  );
  return { added: titles.length };
}
