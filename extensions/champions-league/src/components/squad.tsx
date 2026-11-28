import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getSquad } from "../api";
import ErrorView from "./error_view";
import { Team } from "../types";
import {
  getFlagEmoji,
  playerImage,
  playerName,
  positionLabel,
  seasonLabel,
  t,
  teamName,
} from "../utils";
import PlayerProfile from "./player_profile";

export default function ClubSquad({
  team,
  seasonYear,
}: {
  team: Team;
  seasonYear: string;
}) {
  const { data, isLoading, error, revalidate } = useCachedPromise(getSquad, [
    seasonYear,
    team.id,
  ]);

  return (
    <Grid
      isLoading={isLoading}
      columns={6}
      aspectRatio="3/4"
      fit={Grid.Fit.Fill}
      navigationTitle={`${teamName(team)} | Squad ${seasonLabel(seasonYear)}`}
      searchBarPlaceholder="Search squad"
    >
      {error ? (
        <ErrorView grid error={error} onRetry={revalidate} />
      ) : (
        <Grid.EmptyView
          icon={Icon.TwoPeople}
          title="No squad registered for this season"
        />
      )}
      {data?.coaches?.length ? (
        <Grid.Section title="Coaching Staff">
          {data.coaches.map((coach) => (
            <Grid.Item
              key={coach.person.id + coach.role}
              content={playerImage({
                ...coach.person,
                imageUrl: coach.imageUrl,
              })}
              title={playerName(coach.person)}
              subtitle={t(coach.translations, "role", coach.role)}
            />
          ))}
        </Grid.Section>
      ) : null}
      {data?.squad?.map((group) => (
        <Grid.Section
          key={group.fieldPosition}
          title={t(
            group.translations,
            "fieldPosition",
            positionLabel(group.fieldPosition),
          )}
        >
          {group.players.map(({ player, jerseyNumber }) => (
            <Grid.Item
              key={player.id}
              content={playerImage(player)}
              title={`${jerseyNumber ? `${jerseyNumber}. ` : ""}${playerName(player)}`}
              subtitle={`${getFlagEmoji(player.countryCode)} ${t(player.translations, "countryName", player.countryCode ?? "")}`}
              keywords={[player.clubShirtName ?? "", player.countryCode ?? ""]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Profile"
                    icon={Icon.Person}
                    target={
                      <PlayerProfile player={player} seasonYear={seasonYear} />
                    }
                  />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      ))}
    </Grid>
  );
}
