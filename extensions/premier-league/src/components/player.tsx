import { Action, ActionPanel, Detail, Grid, Icon, List } from "@raycast/api";
import { useState } from "react";
import { Player, PlayerSeasonId } from "../types";
import { formatDate, getFlagEmoji, getProfileImg } from "../utils";
import { usePromise } from "@raycast/utils";
import { getPlayerInformation, getPlayerStats, getSeasons } from "../api";
import SearchBarSeason from "./searchbar_season";

const toPercentage = (success: number = 0, unsuccess: number = 0) => {
  const total = success + unsuccess;
  const percent = total > 0 ? (success * 100) / total : 0;

  return `${total} (${percent.toFixed(2)}%)`;
};

export const PlayerStats = (props: { id: PlayerSeasonId }) => {
  const [seasonId, setSeasonId] = useState<string>();

  const { data: stats, isLoading } = usePromise(
    async (season, playerId) =>
      season ? await getPlayerStats(season, playerId) : undefined,
    [seasonId, props.id.playerId],
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${stats?.player.name} | Statistics`}
      searchBarAccessory={
        <SearchBarSeason selected={seasonId} onSelect={setSeasonId} />
      }
    >
      {!stats && (
        <List.EmptyView
          icon="premier-league.svg"
          title="No stats available yet"
          description="Try a different search"
        />
      )}
      {stats && (
        <List.Section>
          {stats?.stats.appearances && (
            <List.Item
              title="Appearances"
              subtitle={stats?.stats.appearances.toFixed()}
            />
          )}
          {stats?.stats.goalsConceded && (
            <List.Item
              title="Goals Conceded"
              subtitle={stats?.stats.goalsConceded.toFixed()}
            />
          )}
          {stats?.stats.cleanSheets && (
            <List.Item
              title="Clean Sheets"
              subtitle={stats?.stats.cleanSheets.toFixed()}
            />
          )}
        </List.Section>
      )}
      {stats && (
        <List.Section title="Attack">
          {stats?.stats.expectedGoals && (
            <List.Item
              title="XG"
              subtitle={stats?.stats.expectedGoals.toFixed(2)}
            />
          )}
          {stats?.stats.expectedAssists && (
            <List.Item
              title="XA"
              subtitle={stats?.stats.expectedAssists.toFixed(2)}
            />
          )}
          {stats?.stats.goalsConcededInsideBox && (
            <List.Item
              title="Shots On Target Inside the Box"
              subtitle={stats?.stats.goalsConcededInsideBox.toFixed()}
            />
          )}
          {stats?.stats.totalTouchesInOppositionBox && (
            <List.Item
              title="Touches in the Opposition Box"
              subtitle={stats?.stats.totalTouchesInOppositionBox.toFixed()}
            />
          )}
        </List.Section>
      )}
      {stats && (
        <List.Section title="Possession">
          <List.Item
            title="Passes (Completed %)"
            subtitle={toPercentage(
              stats?.stats?.successfulShortPasses,
              stats?.stats?.unsuccessfulShortPasses,
            )}
          />
          {/* <List.Item
            title="Crosses (Completed %)"
            subtitle={toPercentage()}
          /> */}
          <List.Item
            title="Long Passes (Completed %)"
            subtitle={toPercentage(
              stats?.stats?.successfulLongPasses,
              stats?.stats?.unsuccessfulLongPasses,
            )}
          />
        </List.Section>
      )}
      {stats && (
        <List.Section title="Physical">
          {stats?.stats.timePlayed && (
            <List.Item
              title="Minutes Played"
              subtitle={stats?.stats.timePlayed.toFixed()}
            />
          )}
          <List.Item
            title="Dribbles (Completed %)"
            subtitle={toPercentage(
              stats?.stats?.successfulDribbles,
              stats?.stats?.unsuccessfulDribbles,
            )}
          />
          {stats?.stats.duelsWon && (
            <List.Item
              title="Duels Won"
              subtitle={stats?.stats.duelsWon.toFixed()}
            />
          )}
          {stats?.stats.aerialDuelsWon && (
            <List.Item
              title="Aerial Duels Won"
              subtitle={stats?.stats.aerialDuelsWon.toFixed()}
            />
          )}
        </List.Section>
      )}
      {stats && (
        <List.Section title="Defence">
          {stats?.stats.totalTackles && (
            <List.Item
              title="Total Tackles"
              subtitle={stats?.stats.totalTackles.toFixed()}
            />
          )}
          {stats?.stats.interceptions && (
            <List.Item
              title="Interceptions"
              subtitle={stats?.stats.interceptions.toFixed()}
            />
          )}
          {stats?.stats.blockedShots && (
            <List.Item
              title="Blocks"
              subtitle={stats?.stats.blockedShots.toFixed()}
            />
          )}
        </List.Section>
      )}
      {stats && (
        <List.Section title="Discipline">
          <List.Item
            title="Red Cards"
            subtitle={stats?.stats.straightRedCards.toFixed()}
          />
          <List.Item
            title="Yellow Cards"
            subtitle={stats?.stats.yellowCards.toFixed()}
          />
          {stats?.stats.totalFoulsConceded && (
            <List.Item
              title="Fouls"
              subtitle={stats?.stats.totalFoulsConceded.toFixed()}
            />
          )}
          {stats?.stats.offsides && (
            <List.Item
              title="Offsides"
              subtitle={stats?.stats.offsides.toFixed()}
            />
          )}
          {stats?.stats.ownGoalScored && (
            <List.Item
              title="Own Goals"
              subtitle={stats?.stats.ownGoalScored.toFixed()}
            />
          )}
        </List.Section>
      )}
    </List>
  );
};

export const PlayerProfile = (props: { id: string }) => {
  const { data: seasons } = usePromise(getSeasons);
  const { data: player } = usePromise(
    async (season, playerId) =>
      season ? await getPlayerInformation(season, playerId) : undefined,
    [seasons?.[0].seasonId, props.id],
  );

  return (
    player && (
      <Detail
        navigationTitle={`${player.name.display} | Profile & Stats`}
        markdown={`## ${player.name.display}
<img src="${getProfileImg(props.id)}" alt="${player.name.display}" width="220" height="280" />
`}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Date of Birth"
              text={formatDate(player.dates.birth, "yyyy-MM-dd", "dd MMM yyyy")}
            />
            <Detail.Metadata.Label title="Position" text={player.position} />
            <Detail.Metadata.Label
              title="Nationality"
              icon={getFlagEmoji(player.country.isoCode)}
              text={player.country.country}
            />
            <Detail.Metadata.Label
              title="Place of Birth"
              text={player.countryOfBirth}
            />
            <Detail.Metadata.Separator />
            {player.height && (
              <Detail.Metadata.Label
                title="Height"
                text={`${player.height}cm`}
              />
            )}
            {player.weight && (
              <Detail.Metadata.Label
                title="Weight"
                text={`${player.weight}kg`}
              />
            )}
            <Detail.Metadata.Label
              title="Shirt Number"
              text={player.shirtNum?.toString()}
            />
            <Detail.Metadata.Label
              title="Preferred Foot"
              text={player.preferredFoot}
            />
            {player.dates.joinedClub && (
              <Detail.Metadata.Label
                title="Joined Date"
                text={formatDate(
                  player.dates.joinedClub,
                  "yyyy-MM-dd",
                  "dd MMM yyyy",
                )}
              />
            )}
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action.Push
              title="Player Stats"
              icon={Icon.Info}
              target={
                <PlayerStats id={player.id as unknown as PlayerSeasonId} />
              }
            />
            <Action.OpenInBrowser
              url={`https://www.premierleague.com/en/players/${props.id}/${player.name.display.toLowerCase().replace(/ /g, "-")}/overview`}
            />
          </ActionPanel>
        }
      />
    )
  );
};

export const PositionSection = (players: Player[]) => {
  return players.map((player) => {
    return (
      <Grid.Item
        key={player.id}
        title={player.name.display}
        keywords={[player.position]}
        content={{
          source: getProfileImg(player.id),
          fallback: "player-missing.png",
        }}
        accessory={{
          icon: getFlagEmoji(player.country.isoCode),
          tooltip: player.country.country,
        }}
        actions={
          <ActionPanel>
            <Action.Push
              title="View Profile"
              icon={Icon.Sidebar}
              target={<PlayerProfile {...player} />}
            />
          </ActionPanel>
        }
      />
    );
  });
};
