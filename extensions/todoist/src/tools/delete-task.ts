import crypto from "crypto";

import { Action } from "@raycast/api";

import { sync_token, syncRequest, getTask } from "../api";
import { withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * The ID of the task to delete
   */
  id: string;
};

export default withTodoistApi(async function (input: Input) {
  return syncRequest({
    sync_token,
    resource_types: ["items"],
    commands: [
      {
        type: "item_delete",
        uuid: crypto.randomUUID(),
        args: { id: input.id },
      },
    ],
  });
});

export const confirmation = withTodoistApi(async ({ id }: Input) => {
  const task = await getTask(id);

  return {
    style: Action.Style.Destructive,
    info: [
      { name: "Task", value: task.content },
      { name: "Description", value: task.description || "No description" },
      { name: "Due Date", value: task.due?.string || "No due date" },
      { name: "Priority", value: `P${task.priority}` },
    ],
  };
});
