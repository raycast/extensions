import crypto from "crypto";

import { Action } from "@raycast/api";

import { sync_token, syncRequest } from "../api";
import { withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * The ID of the section to delete
   */
  id: string;
};

export default withTodoistApi(async function (input: Input) {
  return syncRequest({
    sync_token,
    resource_types: ["sections"],
    commands: [
      {
        type: "section_delete",
        uuid: crypto.randomUUID(),
        args: { id: input.id },
      },
    ],
  });
});

export const confirmation = withTodoistApi(async ({ id }: Input) => {
  const { sections, projects } = await syncRequest({
    sync_token,
    resource_types: ["sections", "projects"],
  });

  const section = sections.find((s) => s.id === id);
  const project = projects.find((p) => p.id === section?.project_id);

  return {
    style: Action.Style.Destructive,
    info: [
      { name: "Section", value: section?.name },
      { name: "Project", value: project?.name },
    ],
  };
});
