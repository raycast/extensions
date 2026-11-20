import { describeTask, requireMise } from "../ai/tools";
import { listTasks } from "../mise/tasks";

/**
 * Lists the global mise tasks, from `[tasks]` in the global config and `~/.config/mise/tasks/`,
 * with their descriptions, aliases, tags and the commands they run. Call it before running a task,
 * to find its exact name.
 */
export default async function tool() {
  const tasks = await listTasks(await requireMise());
  return tasks.map(describeTask);
}
