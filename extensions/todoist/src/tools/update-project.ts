import crypto from "crypto";

import { ProjectViewStyle, sync_token, syncRequest } from "../api";
import { withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * The ID of the project to update
   */
  id: string;
  /**
   * The new name of the project (optional)
   */
  name?: string;
  /**
   * The new color of the project icon (optional). Available colors:
   * - berry_red (#B8255F)
   * - red (#DC4C3E)
   * - orange (#C77100)
   * - yellow (#B29104)
   * - olive_green (#949C31)
   * - lime_green (#65A33A)
   * - green (#369307)
   * - mint_green (#42A393)
   * - teal (#148FAD)
   * - sky_blue (#319DC0)
   * - light_blue (#6988A4)
   * - blue (#4180FF)
   * - grape (#692EC2)
   * - violet (#CA3FEE)
   * - lavender (#A4698C)
   * - magenta (#65A33A)
   * - salmon (#C9766F)
   * - charcoal (#808080)
   * - grey (#999999)
   */
  color?: string;
  /**
   * Whether the project is collapsed (optional)
   */
  collapsed?: boolean;
  /**
   * Whether the project is marked as favorite (optional)
   */
  is_favorite?: boolean;
  /**
   * Display style of the project in Todoist clients (optional). Can be 'list' or 'board'
   */
  view_style?: ProjectViewStyle;
};

export default withTodoistApi(async function (input: Input) {
  return syncRequest({
    sync_token,
    resource_types: ["projects"],
    commands: [
      {
        type: "project_update",
        uuid: crypto.randomUUID(),
        args: input,
      },
    ],
  });
});

export const confirmation = withTodoistApi(async ({ id, name, color, view_style }: Input) => {
  const { projects } = await syncRequest({
    sync_token,
    resource_types: ["projects"],
  });

  const project = projects.find((p) => p.id === id);
  const info = [{ name: "Project", value: project?.name }];

  if (name) {
    info.push({ name: "New Name", value: name });
  }
  if (color) {
    info.push({ name: "New Color", value: color });
  }
  if (view_style) {
    info.push({ name: "New View Style", value: view_style });
  }

  return { info };
});
