import { Icon } from "@raycast/api";

import { TeamResult } from "../api/getTeams";
import emojis from "node-emoji";

export function getTeamIcon(team: TeamResult) {
  if (team.icon) {
    const emojiMatch = /:(.*):/.exec(team.icon);

    if (emojiMatch) {
      return emojis.get(emojiMatch[1]) || Icon.Person;
    }

    return { source: `project/${team.icon.toLowerCase()}.svg`, tintColor: team.color };
  }

  return team.organization.logoUrl ? encodeURI(team.organization.logoUrl) : Icon.Person;
}
