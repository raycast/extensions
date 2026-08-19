import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import groupBy from "lodash.groupby";
import { getAwards } from "./api";
import { PlayerProfile } from "./components/player";
import SearchBarSeason, {
  useSeasonSelection,
} from "./components/searchbar_season";
import { awardMap, formatDate, getProfileImg } from "./utils";
import { Player } from "./types";

export default function EPLAward() {
  const {
    seasonId,
    setSeasonId,
    seasons,
    isLoading: isLoadingSeasons,
  } = useSeasonSelection();

  const { data: awardsResult, isLoading: isLoadingAwards } = usePromise(
    async (season) =>
      season ? { seasonId: season, data: await getAwards(season) } : undefined,
    [seasonId],
  );

  const isLoading =
    isLoadingSeasons ||
    !seasonId ||
    isLoadingAwards ||
    awardsResult?.seasonId !== seasonId;
  const data = awardsResult?.data;
  const awards = data?.player_awards?.concat(data?.manager_awards ?? []) ?? [];

  const getAwardGrids = (awards: Player[] | undefined) => {
    return awards
      ?.sort((a, b) => a.type.toString().localeCompare(b.type.toString()))
      .map((award) => {
        return (
          <Grid.Item
            key={[award.id, award.type].join()}
            title={awardMap[award.type]}
            subtitle={award.name?.display || award.currentTeam?.name}
            content={{
              source: getProfileImg(award.id),
              fallback: "player-missing.png",
            }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Profile"
                  icon={Icon.Person}
                  target={<PlayerProfile {...award} />}
                />
              </ActionPanel>
            }
          />
        );
      });
  };

  return (
    <Grid
      throttle
      isLoading={isLoading}
      columns={4}
      searchBarAccessory={
        <SearchBarSeason
          selected={seasonId}
          onSelect={setSeasonId}
          seasons={seasons}
          isLoading={isLoadingSeasons}
        />
      }
    >
      {!isLoading && awards.length === 0 && (
        <Grid.EmptyView
          icon="premier-league.svg"
          title="No Awards Announced Yet"
          description="Awards for this season will appear here when they are announced."
        />
      )}
      {Object.entries(groupBy(awards, "date"))
        .reverse()
        .map(([date, monthAwards]) => {
          const month = formatDate(date, "yyyy-M", "MMMM yyyy");

          return (
            <Grid.Section
              title={
                monthAwards[0].type.endsWith("OTM") ? month : "Season Awards"
              }
              key={date}
              children={getAwardGrids(monthAwards)}
            />
          );
        })}
    </Grid>
  );
}
