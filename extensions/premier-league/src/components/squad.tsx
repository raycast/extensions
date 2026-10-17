import { Grid } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import groupBy from "lodash.groupby";
import { getSeasons, getTeamSquad } from "../api";
import { Club } from "../types";
import { positions } from "../utils";
import { PositionSection } from "./player";

export default function ClubSquad(club: Club) {
  const { data: seasons = [] } = usePromise(getSeasons);

  const { data, isLoading } = usePromise(
    async (season) => {
      return season ? await getTeamSquad(season, club.id) : undefined;
    },
    [seasons[0]?.seasonId],
  );

  const playersByPosition = groupBy(data?.players, "position");

  return (
    <Grid
      throttle
      isLoading={isLoading}
      navigationTitle={`Squad | ${club.name} | Club`}
    >
      {positions.map((position) => {
        const players = playersByPosition[position] || [];

        return (
          <Grid.Section
            key={position}
            title={position}
            children={PositionSection(players)}
          />
        );
      })}
    </Grid>
  );
}
