import fs from "fs";
import path from "path";

import { environment } from "@raycast/api";
import * as emojis from "node-emoji";

import type { MentionProjectResult } from "../api/getProjects";

import { projectIconColor, tintProjectIconSvg } from "./mentions";

/** Linear's color for a project without one. */
const DEFAULT_PROJECT_COLOR = "#bec2c8";

/**
 * The icon a project's mention row and pill show, as Linear draws the project: its emoji, or its
 * icon (Linear's box when it has none) in its color. A mention item's icon is a string carried in
 * the mention token the model reads, so a colored icon is written once to the support folder and
 * named by path rather than inlined as an SVG data URI.
 */
export function getProjectMentionIcon(project: Pick<MentionProjectResult, "icon" | "color">): string {
  const icon = project.icon?.trim();
  if (icon && /^:.+:$/.test(icon)) {
    // node-emoji answers an unknown code with the code itself.
    const emoji = emojis.get(icon);
    if (emoji && emoji !== icon) return emoji;
  }
  const name = icon && /^[\w-]+$/.test(icon) ? icon.toLowerCase() : undefined;
  const iconPath = name ? path.join(environment.assetsPath, "linear-icons", `${name}.svg`) : undefined;
  const source =
    iconPath && fs.existsSync(iconPath) ? iconPath : path.join(environment.assetsPath, "light", "project.svg");
  const color = projectIconColor(project.color) ?? DEFAULT_PROJECT_COLOR;
  const target = path.join(
    environment.supportPath,
    "project-mention-icons",
    `${path.basename(source, ".svg")}-${color.slice(1)}.svg`,
  );
  try {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, tintProjectIconSvg(fs.readFileSync(source, "utf8"), color));
    }
    return target;
  } catch {
    // Without a writable support folder, the uncolored icon still beats no icon.
    return source;
  }
}
