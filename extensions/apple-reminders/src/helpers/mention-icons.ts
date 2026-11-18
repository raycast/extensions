import fs from "fs";
import path from "path";

import { Icon, environment } from "@raycast/api";

import { hexListColor, listIconSvg, type MentionList } from "./mentions";

/**
 * A mention item's icon is a string carried in the mention token the model reads, so the list icon in the list's color is
 * written once per color to the support folder and named by path instead: the token stays short whatever the artwork.
 */
export function getListMentionIcon(list: Pick<MentionList, "color">): string {
  const color = hexListColor(list.color);
  if (!color) return Icon.List;
  const target = path.join(environment.supportPath, "mention-icons", `list-${color.slice(1)}.svg`);
  try {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, listIconSvg(color));
    }
    return target;
  } catch {
    // Without a writable support folder, the plain list icon still beats no icon.
    return Icon.List;
  }
}
