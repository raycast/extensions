import { Icon } from "@raycast/api";

import { OrganizationResult, TeamResult } from "../api/getTeams";

import { getIcon } from "./icons";

export function getTeamIcon(team: TeamResult, organization?: OrganizationResult) {
  const fallbackIcon = organization?.logoUrl ? encodeURI(organization.logoUrl) : Icon.TwoPeople;

  return getIcon({ icon: team.icon, color: team.color, fallbackIcon });
}
