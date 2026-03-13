import crypto from "crypto";

import { sync_token, syncRequest } from "../api";
import { withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * The ID of the task to add the comment to
   */
  item_id: string;
  /**
   * The content of the comment. Supports markdown-formatted text and hyperlinks
   */
  content: string;
  /**
   * Optional array of user IDs to notify about this comment
   */
  uids_to_notify?: string[];
};

export default withTodoistApi(async function (input: Input) {
  const temp_id = crypto.randomUUID();

  return syncRequest({
    sync_token,
    resource_types: ["notes"],
    commands: [
      {
        type: "note_add",
        temp_id,
        uuid: crypto.randomUUID(),
        args: input,
      },
    ],
  });
});
