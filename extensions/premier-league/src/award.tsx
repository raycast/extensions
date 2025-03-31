import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { getAwards } from "./api";
import { PlayerProfile } from "./components/player";
import SearchBarSeason from "./components/searchbar_season";
import { Award } from "./types";
import {
  awardMap,
  convertToLocalTime,
  getClubLogo,
  getProfileImg,
} from "./utils";

export default function EPLAward() {
  const [seasonId, setSeasonId] = useState<string>();

  const { data: awards, isLoading } = usePromise(
    async (season) => (season ? await getAwards(season) : undefined),
    [seasonId],
  );

  const getAwardGrids = (awards: Award[] | undefined) => {
    return awards?.map((award) => {
      return (
        <Grid.Item
          key={award.awardTypeId}
          title={awardMap[award.award]}
          subtitle={
            award.official?.name.display ||
            award.player?.name.display ||
            award.apiTeam?.name
          }
          content={{
            source: award.apiTeam
              ? getClubLogo(award.apiTeam.altIds.opta)
              : getProfileImg(
                  award.official?.altIds.opta || award.player?.altIds.opta,
                ),
            fallback: "player-missing.png",
          }}
          actions={
            award.player && (
              <ActionPanel>
                <Action.Push
                  title="View Profile"
                  icon={Icon.Person}
                  target={<PlayerProfile {...award.player} />}
                />
              </ActionPanel>
            )
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
      <Grid.Section
        title="Season Awards"
        children={getAwardGrids(awards?.seasonAwards)}
      />

      {Object.entries(awards?.monthAwards || {})
        .reverse()
        .map(([date, monthAwards]) => {
          return (
            <Grid.Section
              title={convertToLocalTime(date, "MMMM yyyy", "yyyy-MM-dd")}
              key={date}
              children={getAwardGrids(monthAwards)}
            />
          );
        })}
    </Grid>
  );
}
