import { Tool } from "@raycast/api";
import { findTask, planTask, requireMise, runGlobalTask } from "../ai/tools";

type Input = {
  /**
   * The name or alias of a global mise task, exactly as List Tasks returns it.
   */
  task: string;
};

// The approval shows mise's own plan for the run rather than the global task's definition, so it
// lists what actually runs, dependencies included, even when ~/mise.toml redefines one of them.
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const mise = await requireMise();
  const task = await findTask(mise, input.task);
  return {
    message: `Run the global mise task "${task.name}"? It runs with your account's access.`,
    info: [
      { name: "Runs", value: await planTask(mise, task) },
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
