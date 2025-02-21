import crypto from "crypto";

import { Action } from "@raycast/api";

import { sync_token, syncRequest } from "../api";
import { withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * The ID of the comment to delete
   */
  id: string;
};

export default withTodoistApi(async function (input: Input) {
  return syncRequest({
    sync_token,
    resource_types: ["notes"],
    commands: [
      {
        type: "note_delete",
        uuid: crypto.randomUUID(),
        args: { id: input.id },
      },
    ],
  });
});

export const confirmation = withTodoistApi(async ({ id }: Input) => {
  const comments = await syncRequest({
    sync_token,
    resource_types: ["notes"],
  });

  const comment = comments.notes.find((note) => note.id === id);

  return {
    style: Action.Style.Destructive,
    info: [{ name: "Comment", value: comment?.content }],
  };
});
