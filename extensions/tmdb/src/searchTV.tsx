import { useState } from "react";
import { ActionPanel, Action, List, getPreferenceValues } from "@raycast/api";
import { MovieDb } from "moviedb-promise";
import { TvResult } from "moviedb-promise/dist/./request-types";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [tvs, setTVs] = useState<TvResult[]>([]);
  const STAR = "⭐";

  const prefrences = getPreferenceValues();
  const moviedb = new MovieDb(prefrences.apiKey);

  const searchTV = async (query: string) => {
    setIsLoading(true);
    moviedb
      .searchTv({ query: query })
      .then((res: any) => {
        setTVs(res.results);
        setIsLoading(false);
      })
      .catch((err: any) => {
        setIsLoading(false);
      });
  };

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      throttle
      onSearchTextChange={(query: string) => {
        searchTV(query);
      }}
    >
      {!isLoading &&
        tvs.map((tv: TvResult) => (
          <List.Item
            key={`${tv.id}+${tv.backdrop_path ?? ""}`}
            title={tv.original_name ?? "Unknwon Show"}
            icon={`https://image.tmdb.org/t/p/w200/${tv.poster_path}`}
            detail={
              <List.Item.Detail
                markdown={`![Movie Banner](https://image.tmdb.org/t/p/w500/${tv.backdrop_path})
                ${tv.overview ?? ""}
                `}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Title" text={tv.original_name ?? "Unknwon"} />
                    <List.Item.Detail.Metadata.Label title="Release Date" text={tv.first_air_date ?? "Unknwon"} />
                    <List.Item.Detail.Metadata.Label
                      title="Rating"
                      text={`${STAR.repeat(Math.round((tv.vote_average ?? 0) / 2))}`}
                    />
                    <List.Item.Detail.Metadata.Label title="Vote Average" text={`${tv.vote_average ?? 0.0}`} />
                    <List.Item.Detail.Metadata.Label title="Vote Count" text={`${tv.vote_count ?? 0}`} />
                    <List.Item.Detail.Metadata.Separator />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://www.themoviedb.org/tv/${tv.id}`} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
