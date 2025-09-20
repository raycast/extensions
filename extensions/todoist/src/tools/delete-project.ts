import crypto from "crypto";

import { Action } from "@raycast/api";

import { sync_token, syncRequest, getProject } from "../api";
import { withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * The ID of the project to delete
   */
  id: string;
};

export default withTodoistApi(async function (input: Input) {
  return syncRequest({
    sync_token,
    resource_types: ["projects"],
    commands: [
      {
        type: "project_delete",
        uuid: crypto.randomUUID(),
        args: { id: input.id },
      },
    ],
  });
});

export const confirmation = withTodoistApi(async ({ id }: Input) => {
  const project = await getProject(id);

  return {
    style: Action.Style.Destructive,
    info: [{ name: "Project", value: project.name }],
  };
});
