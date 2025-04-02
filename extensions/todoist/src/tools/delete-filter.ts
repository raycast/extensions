import crypto from "crypto";

import { Action } from "@raycast/api";

import { sync_token, syncRequest } from "../api";
import { withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * The ID of the filter to delete
   */
  id: string;
};

export default withTodoistApi(async function (input: Input) {
  return syncRequest({
    sync_token,
    resource_types: ["filters"],
    commands: [
      {
        type: "filter_delete",
        uuid: crypto.randomUUID(),
        args: { id: input.id },
      },
    ],
  });
});

export const confirmation = withTodoistApi(async ({ id }: Input) => {
  const { filters } = await syncRequest({
    sync_token,
    resource_types: ["filters"],
  });

  const filter = filters.find((f) => f.id === id);

  return {
    style: Action.Style.Destructive,
    info: [
      { name: "Filter", value: filter?.name },
      { name: "Query", value: filter?.query },
    ],
  };
});
