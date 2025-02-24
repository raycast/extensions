import crypto from "crypto";

import { sync_token, syncRequest } from "../api";
import { withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * The ID of the task to uncomplete (reopen)
   */
  id: string;
};

export default withTodoistApi(async function (input: Input) {
  return syncRequest({
    sync_token,
    resource_types: ["items"],
    commands: [
      {
        type: "item_uncomplete",
        uuid: crypto.randomUUID(),
        args: {
          id: input.id,
        },
      },
    ],
  });
});
