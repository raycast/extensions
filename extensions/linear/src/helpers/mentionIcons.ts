import { createHash } from "crypto";
import fs from "fs";
import path from "path";

import { Icon, environment } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import * as emojis from "node-emoji";

import type { IssueResult } from "../api/getIssues";
import type { MentionProjectResult } from "../api/getProjects";

import { hexIconColor, tintIconSvg } from "./mentions";
import { statusIcons } from "./states";

/** Linear's color for a project or state without one. */
const DEFAULT_COLOR = "#bec2c8";

/**
 * A mention item's icon is a string carried in the mention token the model reads, so an icon
 * Raycast would draw with a tint or as a data URI is written once to the support folder and named
 * by path instead: the token stays short whatever the artwork.
 */
function cachedIcon(name: string, svg: () => string): string | undefined {
  const target = path.join(environment.supportPath, "mention-icons", name);
  try {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, svg());
    }
    return target;
  } catch {
    return undefined;
  }
}

/** A bundled single-color asset in a Linear color, as the extension's commands tint it. */
function tintedAsset(asset: string, color: string | null | undefined): string {
  const source = path.join(environment.assetsPath, asset);
  const hex = hexIconColor(color) ?? DEFAULT_COLOR;
  const name = `${path.basename(asset, ".svg")}-${hex.slice(1)}.svg`;
  // Without a writable support folder, the uncolored icon still beats no icon.
  return cachedIcon(name, () => tintIconSvg(fs.readFileSync(source, "utf8"), hex)) ?? source;
}

/** A project as Linear draws it: its emoji, or its icon (Linear's box when it has none) in its color. */
export function getProjectMentionIcon(project: Pick<MentionProjectResult, "icon" | "color">): string {
  const icon = project.icon?.trim();
  if (icon && /^:.+:$/.test(icon)) {
    // node-emoji answers an unknown code with the code itself.
    const emoji = emojis.get(icon);
    if (emoji && emoji !== icon) return emoji;
  }
  const name = icon && /^[\w-]+$/.test(icon) ? icon.toLowerCase() : undefined;
  const asset =
    name && fs.existsSync(path.join(environment.assetsPath, "linear-icons", `${name}.svg`))
      ? `linear-icons/${name}.svg`
      : "light/project.svg";
  return tintedAsset(asset, project.color);
}

/** An issue's status icon in its state's color, as Linear lists issues. */
export function getIssueMentionIcon(issue: { state: Pick<IssueResult["state"], "type" | "color"> }): string {
  const asset = statusIcons[issue.state.type]?.light ?? statusIcons.unstarted.light;
  return tintedAsset(String(asset), issue.state.color);
}

/** The user's avatar, else their initials on a colored circle, as the extension's commands show users. */
export function getUserMentionIcon(user: { name: string; displayName?: string | null; avatarUrl?: string | null }) {
  if (user.avatarUrl) return encodeURI(user.avatarUrl);
  const name = (user.displayName?.trim() || user.name).toUpperCase();
  const avatar = getAvatarIcon(name);
  const hash = createHash("sha1").update(name).digest("hex").slice(0, 12);
  return (
    cachedIcon(`initials-${hash}.svg`, () => decodeURIComponent(avatar.slice(avatar.indexOf(",") + 1))) ?? Icon.Person
  );
}
