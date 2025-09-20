import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { MovieResponse } from "moviedb-promise";
import { format } from "date-fns";
import { useCachedPromise } from "@raycast/utils";
import { moviedb } from "../api";
import { formatMovieDuration } from "../helpers";
import Posters from "./Posters";
import Backdrops from "./Backdrops";

export default function MovieDetail({ movie }: { movie: MovieResponse }) {
  const { data: details, isLoading: isLoadingDetails } = useCachedPromise(
    async (id) => {
      if (id) {
        return moviedb.movieInfo({ id });
      }
    },
    [movie.id],
  );

  const { data: providers, isLoading: isLoadingProviders } = useCachedPromise(
    async (id) => {
      if (id) {
        const data = await moviedb.movieWatchProviders({ id });
        return data?.results?.US;
      }
    },
    [movie.id],
  );

  const title = movie.title ?? movie.original_title ?? "Unknown Movie";
  const releaseDate = movie.release_date ? format(new Date(movie.release_date ?? ""), "PP") : "Unknown";
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "No Ratings";
  // const posterUrl = `https://image.tmdb.org/t/p/original/${movie.poster_path}`;

  const markdown = `# ${title}\n![Movie Banner](https://image.tmdb.org/t/p/w500/${movie.backdrop_path})\n\n${
    movie.overview ?? ""
  }`;

  const usdFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoadingDetails || isLoadingProviders}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={title} />
          {details?.runtime ? (
            <Detail.Metadata.Label title="Duration" text={formatMovieDuration(details.runtime)} />
          ) : null}
          <Detail.Metadata.Label title="Release Date" text={releaseDate} />
          {details?.genres ? (
            <Detail.Metadata.TagList title="Genres">
              {details.genres.map((genre) => {
                return <Detail.Metadata.TagList.Item key={genre.id} text={genre.name} />;
              })}
            </Detail.Metadata.TagList>
          ) : null}

          <Detail.Metadata.Label
            title="Rating"
            text={`${rating}${movie.vote_count ? ` (from ${movie.vote_count} votes)` : ""}`}
            icon={{ source: Icon.Star, tintColor: Color.Yellow }}
          />

          {details?.homepage ? (
            <Detail.Metadata.Link title="Homepage" target={details.homepage} text={details.homepage} />
          ) : null}

          <Detail.Metadata.Separator />
          {providers?.flatrate && providers.flatrate.length > 0 ? (
            <Detail.Metadata.TagList title="Where to Watch">
              {providers.flatrate.map((provider) => {
                console.log(provider);
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

          {details?.budget ? <Detail.Metadata.Label title="Budget" text={usdFormatter.format(details.budget)} /> : null}

          {details?.revenue ? (
            <Detail.Metadata.Label title="Revenue" text={usdFormatter.format(details.revenue)} />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in TMDB" url={`https://www.themoviedb.org/movie/${movie.id ?? 0}`} />
          {movie.id ? (
            <Action.CopyToClipboard
              title={`Copy TMDB ID`}
              content={movie.id.toString()}
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
            target={movie.id !== undefined && <Posters id={movie.id} type="movie" />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
          <Action.Push
            title="Show Backdrops"
            icon={Icon.Image}
            target={movie.id !== undefined && <Backdrops id={movie.id} type="movie" />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
          />
        </ActionPanel>
      }
    />
  );
}
