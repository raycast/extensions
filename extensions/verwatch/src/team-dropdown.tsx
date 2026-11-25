import { Icon, Image, List } from "@raycast/api";
import { useState } from "react";
import { Team, TeamRef } from "./api";

export const ALL_TEAMS = "all";

/**
 * The search bar's team switcher (⌘P opens it). Starts on every team and
 * remembers the last choice per command.
 */
export function TeamDropdown({
  teams,
  onChange,
}: {
  teams: Team[];
  onChange: (team: string) => void;
}) {
  if (teams.length < 2) {
    return null;
  }

  return (
    <List.Dropdown
      tooltip="Switch Team"
      storeValue
      defaultValue={ALL_TEAMS}
      onChange={onChange}
    >
      <List.Dropdown.Item
        title="All Teams"
        value={ALL_TEAMS}
        icon={Icon.TwoPeople}
      />
      <List.Dropdown.Section title="Teams">
        {teams.map((team) => (
          <List.Dropdown.Item
            key={team.slug}
            title={team.name}
            value={team.slug}
            icon={teamIcon(team)}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

/**
 * A team's GitHub avatar, or a generic icon until it connects an org.
 */
export function teamIcon(team: TeamRef): Image.ImageLike {
  return team.avatar_url
    ? { source: team.avatar_url, mask: Image.Mask.RoundedRectangle }
    : Icon.TwoPeople;
}

/**
 * The selected team and a filter for items tagged with one. With a single
 * team there is nothing to switch, so everything shows.
 */
export function useTeamFilter() {
  const [team, setTeam] = useState(ALL_TEAMS);

  return {
    team,
    setTeam,
    showsAll: team === ALL_TEAMS,
    includes: (item: { team: TeamRef }) =>
      team === ALL_TEAMS || item.team.slug === team,
  };
}
