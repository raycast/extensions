import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getTeams } from "./api";
import ClubMatches from "./components/club_matches";
import ClubProfile from "./components/club_profile";
import ErrorView from "./components/error_view";
import SearchBarSeason, { useSeasons } from "./components/searchbar_season";
import ClubSquad from "./components/squad";
import { clubUrl, getFlagEmoji, t, teamName } from "./utils";
import { Team } from "./types";

export default function Clubs() {
  const [seasonYear, setSeasonYear] = useState<string>();

  const seasons = useSeasons();
  const {
    data: teams = [],
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async (season?: string) => (season ? getTeams(season) : ([] as Team[])),
    [seasonYear],
    { keepPreviousData: true },
  );

  return (
    <Grid
      throttle
      columns={5}
      inset={Grid.Inset.Medium}
      isLoading={isLoading || (!seasonYear && !seasons.error)}
      searchBarPlaceholder="Search clubs"
      searchBarAccessory={
        <SearchBarSeason grid selected={seasonYear} onSelect={setSeasonYear} />
      }
    >
      {seasons.error || error ? (
        <ErrorView
          grid
          error={(seasons.error ?? error)!}
          onRetry={seasons.error ? seasons.revalidate : revalidate}
        />
      ) : (
        <Grid.EmptyView
          icon={Icon.Shield}
          title="No clubs found for this season"
        />
      )}
      {seasonYear &&
        teams.map((team) => (
          <Grid.Item
            key={team.id}
            title={teamName(team)}
            subtitle={`${getFlagEmoji(team.countryCode)} ${t(team.translations, "countryName", team.countryCode)}`}
            keywords={[team.internationalName, team.teamCode, team.countryCode]}
            content={{
              source: team.bigLogoUrl || team.mediumLogoUrl,
              fallback: Icon.Shield,
            }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Club Profile"
                  icon={Icon.Sidebar}
                  target={<ClubProfile team={team} seasonYear={seasonYear} />}
                />
                <Action.Push
                  title="Squad"
                  icon={Icon.TwoPeople}
                  target={<ClubSquad team={team} seasonYear={seasonYear} />}
                />
                <Action.Push
                  title="Matches"
                  icon={Icon.Calendar}
                  shortcut={{
                    macOS: { modifiers: ["cmd"], key: "m" },
                    Windows: { modifiers: ["ctrl"], key: "m" },
                  }}
                  target={<ClubMatches team={team} seasonYear={seasonYear} />}
                />
                <Action.OpenInBrowser url={clubUrl(team)} />
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
