import { Grid } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { getClubs } from "./api";
import SeasonDropdown from "./components/season_dropdown";

export default function Club() {
  const [season, setSeason] = useState<string>("");

  const { data: clubs, isLoading } = usePromise(
    async (season) => (season ? await getClubs(season) : []),
    [season],
  );

  return (
    <Grid
      throttle
      isLoading={isLoading}
      inset={Grid.Inset.Medium}
      searchBarAccessory={
        <SeasonDropdown type="grid" selected={season} onSelect={setSeason} />
      }
    >
      {clubs?.map((club) => {
        return (
          <Grid.Item
            key={club.id}
            title={club.name}
            content={club.assets.logo.medium}
          />
        );
      })}
    </Grid>
  );
}
