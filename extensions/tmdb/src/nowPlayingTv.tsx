import { useState, useEffect } from "react";
import { ActionPanel, Action, Grid, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { MovieDb } from "moviedb-promise";
import { TvResult } from "moviedb-promise/dist/./request-types";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [tvs, setTVs] = useState<TvResult[]>([]);
  const [page, setPage] = useState("1");
  const STAR = "⭐";

  const prefrences = getPreferenceValues();
  const moviedb = new MovieDb(prefrences.apiKey);

  const fetchTV = async (page: string) => {
    moviedb
      .tvOnTheAir({ page: Number(page) })
      .then((res: any) => {
        setTVs(res.results);
        setIsLoading(false);
      })
      .catch((err: any) => {
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: `${err}` });
      });
  };
  useEffect(() => {
    fetchTV(page);
  }, []);

  return (
    <Grid
      isLoading={isLoading}
      itemSize={Grid.ItemSize.Medium}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Page Number"
          onChange={(newValue) => {
            setPage(newValue);
            fetchTV(newValue);
          }}
          storeValue
        >
          <Grid.Dropdown.Section title="Pages">
            {Array.from(Array(10).keys()).map((i) => (
              <Grid.Dropdown.Item key={i} title={`Page ${i + 1}`} value={`${i + 1}`} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {!isLoading &&
        tvs.map((tv: TvResult) => (
          <Grid.Item
            key={tv.poster_path}
            content={`https://image.tmdb.org/t/p/w500/${tv.poster_path}`}
            title={tv.name ?? "No title"}
            subtitle={`${tv.vote_average ?? 0.0} ${STAR.repeat(Math.round((tv.vote_average ?? 0) / 2))}`}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://www.themoviedb.org/tv/${tv.id}`} />
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
}
