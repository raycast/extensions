import crypto from "crypto";

import { sync_token, syncRequest } from "../api";
import { withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * The ID of the section to move
   */
  id: string;
  /**
   * The ID of the project to move this section to
   */
  project_id: string;
};

export default withTodoistApi(async function (input: Input) {
  return syncRequest({
    sync_token,
    resource_types: ["sections"],
    commands: [
      {
        type: "section_move",
        uuid: crypto.randomUUID(),
        args: {
          id: input.id,
          project_id: input.project_id,
        },
      },
    ],
  });
});

export const confirmation = withTodoistApi(async ({ id, project_id }: Input) => {
  const { sections, projects } = await syncRequest({
    sync_token,
    resource_types: ["sections", "projects"],
  });

  const section = sections.find((s) => s.id === id);
  const project = projects.find((p) => p.id === project_id);

  return {
    info: [
      { name: "Section", value: section?.name },
      { name: "New Project", value: project?.name },
    ],
  };
});
