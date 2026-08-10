import crypto from "crypto";

import { sync_token, syncRequest } from "../api";
import { withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * The ID of the task to move
   */
  id: string;
  /**
   * The ID of the project to move the task to
   */
  project_id?: string;
  /**
   * The ID of the section to move the task to.
   * Only valid for tasks within the same project.
   */
  section_id?: string;
  /**
   * The ID of the parent task to move this task under.
   * Only valid for tasks within the same project.
   */
  parent_id?: string;
};

export default withTodoistApi(async function (input: Input) {
  return syncRequest({
    sync_token,
    resource_types: ["items"],
    commands: [
      {
        type: "item_move",
        uuid: crypto.randomUUID(),
        args: {
          id: input.id,
          project_id: input.project_id,
          section_id: input.section_id,
          parent_id: input.parent_id,
        },
      },
    ],
  });
});

export const confirmation = withTodoistApi(async ({ id, project_id, section_id, parent_id }: Input) => {
  const { items, projects, sections } = await syncRequest({
    sync_token,
    resource_types: ["items", "projects", "sections"],
  });

  const task = items.find((t) => t.id === id);
  const project = project_id ? projects.find((p) => p.id === project_id) : null;
  const section = section_id ? sections.find((s) => s.id === section_id) : null;
  const parentTask = parent_id ? items.find((t) => t.id === parent_id) : null;

  const info = [{ name: "Task", value: task?.content }];

  if (project) {
    info.push({ name: "New Project", value: project.name });
  }
  if (section) {
    info.push({ name: "New Section", value: section.name });
  }
  if (parentTask) {
    info.push({ name: "New Parent Task", value: parentTask.content });
  }

  return { info };
});
