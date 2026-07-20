import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import groupBy from "lodash.groupby";
import { getAwards } from "./api";
import { PlayerProfile } from "./components/player";
import SearchBarSeason from "./components/searchbar_season";
import { awardMap, formatDate, getProfileImg } from "./utils";
import { Player } from "./types";

export default function EPLAward() {
  const [seasonId, setSeasonId] = useState<string>();

  const { data, isLoading } = usePromise(
    async (season) => (season ? await getAwards(season) : undefined),
    [seasonId],
  );

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
        <SearchBarSeason selected={seasonId} onSelect={setSeasonId} />
      }
    >
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
