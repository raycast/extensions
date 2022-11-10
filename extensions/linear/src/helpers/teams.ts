import { Icon } from "@raycast/api";
import emojis from "node-emoji";
import { TeamResult } from "../api/getTeams";

export function getTeamIcon(team: TeamResult) {
  if (!team.icon) {
    return team.organization.logoUrl ? encodeURI(team.organization.logoUrl) : Icon.Person;
  }

  const emojiRegex = new RegExp(/:(.*):/, "g");
  if (team.icon && emojiRegex.test(team.icon)) {
    const emoji = emojis.get(team.icon);
    // if there's no corresponding emoji, the same emoji code is returned
    return emoji === team.icon ? Icon.Person : emoji;
  }

  return { source: `project/${team.icon.toLowerCase()}.svg`, tintColor: team.color };
}
