import { searchTasks, formatTasks } from "../tasks";
import { run } from "./create-task";

type Input = {
  /**
   * Search text.
   */
  query: string;
};

/**
 * Search the user's tasks by text. Does not change anything.
 */
export default async function tool(input: Input): Promise<string> {
  const tasks = await run((api) => searchTasks(api, input.query));
  return formatTasks(tasks);
}
