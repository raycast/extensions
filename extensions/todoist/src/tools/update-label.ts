import crypto from "crypto";

import { sync_token, syncRequest } from "../api";
import { withTodoistApi } from "../helpers/withTodoistApi";

type Input = {
  /**
   * The ID of the label to update
   */
  id: string;
  /**
   * The new name for the label
   */
  name?: string;
  /**
   * The color of the label. Available colors:
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
   * The order of the label in lists
   */
  item_order?: number;
  /**
   * Whether the label is marked as favorite
   */
  is_favorite?: boolean;
};

export default withTodoistApi(async function (input: Input) {
  return syncRequest({
    sync_token,
    resource_types: ["labels"],
    commands: [
      {
        type: "label_update",
        uuid: crypto.randomUUID(),
        args: input,
      },
    ],
  });
});

export const confirmation = withTodoistApi(async ({ id, name, color }: Input) => {
  const { labels } = await syncRequest({
    sync_token,
    resource_types: ["labels"],
  });

  const label = labels.find((l) => l.id === id);
  const info = [{ name: "Label", value: label?.name }];

  if (name) {
    info.push({ name: "New Name", value: name });
  }
  if (color) {
    info.push({ name: "New Color", value: color });
  }

  return { info };
});
