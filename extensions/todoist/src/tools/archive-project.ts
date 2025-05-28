import crypto from "crypto";

import { sync_token, syncRequest } from "../api";
import { withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * The ID of the project to archive
   */
  id: string;
};

export default withTodoistApi(async function (input: Input) {
  return syncRequest({
    sync_token,
    resource_types: ["projects"],
    commands: [
      {
        type: "project_archive",
        uuid: crypto.randomUUID(),
        args: input,
      },
    ],
  });
});

export const confirmation = withTodoistApi(async ({ id }: Input) => {
  const { projects } = await syncRequest({
    sync_token,
    resource_types: ["projects"],
  });

  const project = projects.find((p) => p.id === id);

  return {
    info: [
      { name: "Project", value: project?.name },
      { name: "Action", value: "Archive" },
    ],
  };
});
