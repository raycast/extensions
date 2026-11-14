import { formatTasks, listTasks, type TaskView } from "../tasks";
import { run } from "./create-task";

type Input = {
  /**
   * Smart view. Ignored when list is set. Defaults to today.
   */
  view?: TaskView;
  /**
   * List name or id.
   */
  list?: string;
};

/**
 * Read open tasks for a smart view (today, inbox, upcoming, overdue, backlog) or for one list.
 */
export default async function tool(input: Input): Promise<string> {
  const tasks = await run((api) =>
    listTasks(api, { view: input.view, list: input.list }),
  );
  return formatTasks(tasks);
}
