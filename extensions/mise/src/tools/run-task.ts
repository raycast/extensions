import { Tool } from "@raycast/api";
import { findTask, requireMise, runGlobalTask, taskCommand } from "../ai/tools";

type Input = {
  /**
   * The name or alias of a global mise task, exactly as List Tasks returns it.
   */
  task: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const task = await findTask(await requireMise(), input.task);
  return {
    message: `Run the global mise task "${task.name}"? It runs with your account's access.`,
    info: [
      { name: "Runs", value: taskCommand(task) },
      { name: "Also runs", value: task.depends?.join(", ") },
      { name: "Defined in", value: task.source },
    ],
  };
};

/**
 * Runs a global mise task with `mise run <task>` from the home directory and returns its exit code
 * and the end of its output. The task runs without a terminal, so it can't prompt for input.
 */
export default async function tool(input: Input) {
  return runGlobalTask(await requireMise(), input.task);
}
