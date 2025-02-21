import crypto from "crypto";

import { sync_token, syncRequest } from "../api";
import { withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * The ID of the project to move
   */
  id: string;
  /**
   * The ID of the parent project to move this project to.
   * Leave undefined to move to root level.
   */
  parent_id?: string;
};

export default withTodoistApi(async function (input: Input) {
  return syncRequest({
    sync_token,
    resource_types: ["projects"],
    commands: [
      {
        type: "project_move",
        uuid: crypto.randomUUID(),
        args: {
          id: input.id,
          parent_id: input.parent_id,
        },
      },
    ],
  });
});

export const confirmation = withTodoistApi(async ({ id, parent_id }: Input) => {
  const { projects } = await syncRequest({
    sync_token,
    resource_types: ["projects"],
  });

  const project = projects.find((p) => p.id === id);
  const parentProject = parent_id ? projects.find((p) => p.id === parent_id) : null;

  return {
    info: [
      { name: "Project", value: project?.name },
      { name: "New Parent", value: parentProject?.name ?? "Root Level" },
    ],
  };
});
