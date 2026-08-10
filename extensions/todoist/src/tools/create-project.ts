import crypto from "crypto";

import { ProjectViewStyle, sync_token, syncRequest } from "../api";
import { withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * The name of the project
   */
  name: string;
  /**
   * The color of the project icon. Available colors:
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
   * The ID of the parent project. Set to null for root projects
   */
  parent_id?: string;
  /**
   * The order of the project. Defines the position among projects with the same parent_id
   */
  child_order?: number;
  /**
   * Whether the project is marked as favorite
   */
  is_favorite?: boolean;
  /**
   * Display style of the project in Todoist clients. Can be 'list' or 'board', defaults to 'list'
   */
  view_style?: ProjectViewStyle;
};

export default withTodoistApi(async function (input: Input) {
  const temp_id = crypto.randomUUID();

  return syncRequest({
    sync_token,
    resource_types: ["projects"],
    commands: [
      {
        type: "project_add",
        temp_id,
        uuid: crypto.randomUUID(),
        args: input,
      },
    ],
  });
});
