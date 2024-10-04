import { Grid } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import groupBy from "lodash.groupby";
import { getSeasons, getStaffs } from "../api";
import { Club } from "../types";
import { positionMap } from "../utils";
import { PositionSection } from "./player";

export default function ClubSquad(club: Club) {
  const { data: seasons = [] } = usePromise(getSeasons);

  const { data, isLoading } = usePromise(
    async (season) => {
      return season ? await getStaffs(club.id, season) : undefined;
    },
    [seasons[0]?.id],
  );

  const positions = groupBy(data?.players, "info.position");

  return (
    <Grid
      throttle
      isLoading={isLoading}
      navigationTitle={`Squad | ${club.name} | Club`}
    >
      {Object.entries(positionMap).map(([key, value]) => {
        const players = positions[key] || [];

        return (
          <Grid.Section
            key={key}
            title={value}
            children={PositionSection(players)}
          />
        );
      })}
    </Grid>
  );
}
