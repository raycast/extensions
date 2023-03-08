import { Icon } from "@raycast/api";
import { TeamResult } from "../api/getTeams";
import { getIcon } from "./icons";

export function getTeamIcon(team: TeamResult) {
  const fallbackIcon = team.organization.logoUrl ? encodeURI(team.organization.logoUrl) : Icon.Person;

  return getIcon({ icon: team.icon, color: team.color, fallbackIcon });
}
