import crypto from "crypto";

import { Action } from "@raycast/api";

import { sync_token, syncRequest } from "../api";
import { withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * The ID of the label to delete
   */
  id: string;
};

export default withTodoistApi(async function (input: Input) {
  return syncRequest({
    sync_token,
    resource_types: ["labels"],
    commands: [
      {
        type: "label_delete",
        uuid: crypto.randomUUID(),
        args: { id: input.id },
      },
    ],
  });
});

export const confirmation = withTodoistApi(async ({ id }: Input) => {
  const { labels } = await syncRequest({
    sync_token,
    resource_types: ["labels"],
  });

  const label = labels.find((l) => l.id === id);

  return {
    style: Action.Style.Destructive,
    info: [{ name: "Label", value: label?.name }],
  };
});
