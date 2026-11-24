import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getMatchLineups } from "../api";
import { LineupPlayer, Match, TeamLineup } from "../types";
import {
  getFlagEmoji,
  matchTitle,
  playerImage,
  playerName,
  positionLabel,
  teamName,
} from "../utils";
import PlayerProfile from "./player_profile";

function PlayerItem({
  entry,
  seasonYear,
}: {
  entry: LineupPlayer;
  seasonYear: string;
}) {
  const { player } = entry;
  return (
    <List.Item
      key={player.id}
      icon={playerImage(player)}
      title={entry.jerseyNumber ? String(entry.jerseyNumber) : "–"}
      subtitle={`${playerName(player)}${entry.isCaptain ? " (C)" : ""}`}
      keywords={[playerName(player), player.clubShirtName ?? ""]}
      accessories={[
        { text: positionLabel(entry.type ?? player.fieldPosition) },
        { text: getFlagEmoji(player.countryCode), tooltip: player.countryCode },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Profile"
            icon={Icon.Person}
            target={<PlayerProfile player={player} seasonYear={seasonYear} />}
          />
        </ActionPanel>
      }
    />
  );
}

function TeamSections({
  lineup,
  seasonYear,
}: {
  lineup: TeamLineup;
  seasonYear: string;
}) {
  const name = teamName(lineup.team);
  const coach = lineup.coaches?.[0];

  return (
    <>
      <List.Section
        title={`${name} · Starting XI`}
        subtitle={coach ? `Coach: ${playerName(coach.person)}` : undefined}
      >
        {lineup.field?.map((entry) => (
          <PlayerItem
            key={entry.player.id}
            entry={entry}
            seasonYear={seasonYear}
          />
        ))}
      </List.Section>
      <List.Section title={`${name} · Substitutes`}>
        {lineup.bench?.map((entry) => (
          <PlayerItem
            key={entry.player.id}
            entry={entry}
            seasonYear={seasonYear}
          />
        ))}
      </List.Section>
    </>
  );
}

export default function MatchLineups({ match }: { match: Match }) {
  const [side, setSide] = useState<string>("both");
  const { data, isLoading } = useCachedPromise(getMatchLineups, [match.id]);

  const available =
    data &&
    data.lineupStatus !== "NOT_AVAILABLE" &&
    (data.homeTeam?.field?.length ?? 0) > 0;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${matchTitle(match)} | Lineups`}
      searchBarPlaceholder="Search players"
      searchBarAccessory={
        <List.Dropdown tooltip="Team" value={side} onChange={setSide}>
          <List.Dropdown.Item title="Both Teams" value="both" />
          <List.Dropdown.Item title={teamName(match.homeTeam)} value="home" />
          <List.Dropdown.Item title={teamName(match.awayTeam)} value="away" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.TwoPeople}
        title="Lineups not available yet"
        description="Lineups are usually announced about an hour before kick-off."
      />
      {available && (
        <>
          {side !== "away" && (
            <TeamSections
              lineup={data.homeTeam}
              seasonYear={match.seasonYear}
            />
          )}
          {side !== "home" && (
            <TeamSections
              lineup={data.awayTeam}
              seasonYear={match.seasonYear}
            />
          )}
        </>
      )}
    </List>
  );
}
