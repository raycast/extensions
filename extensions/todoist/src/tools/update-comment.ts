import crypto from "crypto";

import { sync_token, syncRequest } from "../api";
import { withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * The ID of the comment to update
   */
  id: string;
  /**
   * The new content of the comment. Supports markdown-formatted text and hyperlinks
   */
  content: string;
};

export default withTodoistApi(async function (input: Input) {
  return syncRequest({
    sync_token,
    resource_types: ["notes"],
    commands: [
      {
        type: "note_update",
        uuid: crypto.randomUUID(),
        args: input,
      },
    ],
  });
});

export const confirmation = withTodoistApi(async ({ id, content }: Input) => {
  const { notes } = await syncRequest({
    sync_token,
    resource_types: ["notes"],
  });

  const comment = notes.find((n) => n.id === id);

  return {
    info: [
      { name: "Comment", value: comment?.content },
      { name: "New Content", value: content },
    ],
  };
});
