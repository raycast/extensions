import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { ShowResponse } from "moviedb-promise";
import { format } from "date-fns";
import { useCachedPromise } from "@raycast/utils";
import { moviedb } from "../api";
import Posters from "./Posters";
import Backdrops from "./Backdrops";
import Seasons from "./Seasons";

export default function TvShowDetail({ show }: { show: ShowResponse }) {
  const { data: details, isLoading: isLoadingDetails } = useCachedPromise(
    async (id) => {
      if (id) {
        return moviedb.tvInfo({ id });
      }
    },
    [show.id],
  );

  const { data: providers, isLoading: isLoadingProviders } = useCachedPromise(
    async (id) => {
      if (id) {
        const data = await moviedb.tvWatchProviders({ id });
        return data?.results?.US;
      }
    },
    [show.id],
  );

  const title = show.name ?? show.original_language ?? "Unknown TV Show";
  const firstAirDate = show.first_air_date ? format(new Date(show.first_air_date ?? ""), "PP") : "Unknown";
  const rating = show.vote_average ? show.vote_average.toFixed(1) : "No Ratings";

  const markdown = `# ${title}\n![TV Show Banner](https://image.tmdb.org/t/p/w500/${show.backdrop_path})\n\n${
    show.overview ?? ""
  }`;

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoadingDetails || isLoadingProviders}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={title} />
          <Detail.Metadata.Label title="First Air Date" text={firstAirDate} />
          {details?.genres ? (
            <Detail.Metadata.TagList title="Genres">
              {details.genres.map((genre) => {
                return <Detail.Metadata.TagList.Item key={genre.id} text={genre.name} />;
              })}
            </Detail.Metadata.TagList>
          ) : null}

          <Detail.Metadata.Label
            title="Rating"
            text={`${rating}${show.vote_count ? ` (from ${show.vote_count} votes)` : ""}`}
            icon={{ source: Icon.Star, tintColor: Color.Yellow }}
          />

          {details?.homepage ? (
            <Detail.Metadata.Link title="Homepage" target={details.homepage} text={details.homepage} />
          ) : null}

          <Detail.Metadata.Separator />
          {providers?.flatrate && providers.flatrate.length > 0 ? (
            <Detail.Metadata.TagList title="Where to Watch">
              {providers.flatrate.map((provider) => {
                if (!provider.provider_name) return;
                return (
                  <Detail.Metadata.TagList.Item
                    key={provider.provider_id}
                    text={provider.provider_name}
                    icon={`https://image.tmdb.org/t/p/w500/${provider.logo_path}`}
                  />
                );
              })}
            </Detail.Metadata.TagList>
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in TMDB" url={`https://www.themoviedb.org/tv/${show.id ?? 0}`} />
          {show.id ? <Action.Push title="Show Seasons" icon={Icon.Image} target={<Seasons id={show.id} />} /> : null}
          {show.id ? (
            <Action.CopyToClipboard
              title={`Copy TMDB ID`}
              content={show.id.toString()}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
          ) : null}
          {details?.homepage && (
            <Action.OpenInBrowser
              title="Open Homepage"
              url={details.homepage}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
          )}
          <Action.Push
            title="Show Posters"
            icon={Icon.Image}
            target={show.id !== undefined && <Posters id={show.id ?? 0} type="tv" />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
          <Action.Push
            title="Show Backdrops"
            icon={Icon.Image}
            target={show.id !== undefined && <Backdrops id={show.id ?? 0} type="tv" />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
          />
        </ActionPanel>
      }
    />
  );
}
