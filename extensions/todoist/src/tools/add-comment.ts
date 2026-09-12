import crypto from "crypto";

import { sync_token, syncRequest } from "../api";
import { parseOptionalStringList } from "../helpers/parseStringList";
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
   * Optional JSON array of user IDs to notify (e.g. ["123", "456"]) or comma-separated user IDs
   */
  uids_to_notify?: string;
};

export default withTodoistApi(async function (input: Input) {
  const temp_id = crypto.randomUUID();
  const { uids_to_notify, ...commentInput } = input;
  const args = {
    ...commentInput,
    ...(uids_to_notify ? { uids_to_notify: parseOptionalStringList(uids_to_notify) } : {}),
  };

  return syncRequest({
    sync_token,
    resource_types: ["notes"],
    commands: [
      {
        type: "note_add",
        temp_id,
        uuid: crypto.randomUUID(),
        args,
      },
    ],
  });
});
