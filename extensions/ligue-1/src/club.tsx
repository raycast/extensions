import { useEffect, useState } from "react";
import { ClubIdentity } from "./types";
import { getClubs } from "./api";
import SeasonDropdown from "./components/season_dropdown";
import { Grid } from "@raycast/api";

export default function Club() {
  const [clubs, setClubs] = useState<ClubIdentity[]>();
  const [season, setSeason] = useState<string>("");

  useEffect(() => {
    if (season) {
      setClubs(undefined);
      getClubs(season).then((data) => {
        setClubs(data);
      });
    }
  }, [season]);

  return (
    <Grid
      throttle
      isLoading={!clubs}
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
