import { ActionPanel, Action, Grid, Icon, showToast, Toast } from "@raycast/api";
import { moviedb } from "../api";
import { SimpleSeason } from "moviedb-promise";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import Episodes from "./Episodes";

function Seasons({ id }: { id: number }) {
  const [selectedSeason, setSelectedSeason] = useState<string>("all");

  const fetchSeasons = async (id: number) => {
    const response = await moviedb.tvInfo({ id });
    return response.seasons || [];
  };

  const { data: seasonData, isLoading } = useCachedPromise(fetchSeasons, [id], {
    onError: async (error) => {
      await showToast(Toast.Style.Failure, "Failed to fetch data", error.message);
    },
  });

  const filteredSeasons = ((seasonData as SimpleSeason[]) || []).filter(
    (season) =>
      selectedSeason === "all" || selectedSeason === season.season_number?.toString() || season.season_number === 0,
  );

  const seasonStart = seasonData?.[0].season_number || 0;
  const seasonEnd = seasonData?.[seasonData.length - 1].season_number || 0;

  return (
    <Grid
      aspectRatio="2/3"
      fit={Grid.Fit.Fill}
      isLoading={isLoading}
      columns={5}
      searchBarPlaceholder={`Filter TV seasons by name`}
      navigationTitle={`TV Seasons - ${selectedSeason === "all" ? "All" : selectedSeason}`}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter by Season" onChange={setSelectedSeason} value={selectedSeason}>
          <Grid.Dropdown.Section title="Seasons">
            <Grid.Dropdown.Item title="All" value="all" />
            {(seasonData || []).map((season) => (
              <Grid.Dropdown.Item
                key={season.season_number || "no-season"}
                title={season.season_number?.toString() || "Unknown Season"}
                value={season.season_number?.toString() || "no-season"}
              />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {filteredSeasons.map((season) => (
        <Grid.Item
          content={`https://image.tmdb.org/t/p/w342${season.poster_path}`}
          title={`${season.name || "Unknown Season"}`}
          key={season.poster_path}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Episodes for Season"
                icon={Icon.Play}
                target={
                  <Episodes
                    id={id}
                    seasonNumber={!season.season_number ? 0 : season.season_number}
                    seasonStart={seasonStart}
                    seasonEnd={seasonEnd}
                  />
                }
              />
              <Action.OpenInBrowser
                url={`https://www.themoviedb.org/tv/${id}/season/${season.season_number}`}
                title="Open in TMDB"
              />
              <Action.CopyToClipboard
                content={`https://www.themoviedb.org/tv/${id}/season/${season.season_number}`}
                title={`Copy TMDB URL`}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            </ActionPanel>
          }
        />
      ))}
      {seasonData && filteredSeasons.length === 0 && <Grid.Item title="No seasons available" content="" />}
    </Grid>
  );
}

export default Seasons;
