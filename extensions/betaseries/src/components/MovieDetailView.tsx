import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Color,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import {
  buildBetaSeriesUrl,
  getHeaders,
  markMovieAsWatched,
  markMovieAsUnwatched,
  parseBetaSeriesResponse,
  rateMovie,
} from "../api/client";
import { Movie } from "../types/betaseries";

interface MovieDetailViewProps {
  movie: Movie;
}

export function MovieDetailView({ movie: initialMovie }: MovieDetailViewProps) {
  const {
    data: movie = initialMovie,
    isLoading,
    mutate,
  } = useFetch<{ movie: Movie }, Movie, Movie>(
    buildBetaSeriesUrl("/movies/movie", { id: String(initialMovie.id) }),
    {
      headers: getHeaders(),
      initialData: initialMovie,
      keepPreviousData: true,
      parseResponse: (response) =>
        parseBetaSeriesResponse<{ movie: Movie }>(response),
      mapResult: (result) => ({ data: result.movie }),
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load movie details",
          message: error.message,
        });
      },
    },
  );

  const handleMarkAsWatched = async () => {
    try {
      await mutate(markMovieAsWatched(movie.id), {
        shouldRevalidateAfter: false,
        optimisticUpdate: (previous) => ({
          ...(previous || movie),
          user: {
            in_account: previous?.user?.in_account ?? true,
            status: 1,
          },
        }),
      });
      showToast({
        style: Toast.Style.Success,
        title: "Movie marked as watched",
      });
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to mark as watched",
          message: error.message,
        });
      }
    }
  };

  const handleMarkAsUnwatched = async () => {
    try {
      await mutate(markMovieAsUnwatched(movie.id), {
        shouldRevalidateAfter: false,
        optimisticUpdate: (previous) => ({
          ...(previous || movie),
          user: {
            in_account: previous?.user?.in_account ?? true,
            status: 0,
          },
        }),
      });
      showToast({
        style: Toast.Style.Success,
        title: "Movie marked as unwatched",
      });
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to mark as unwatched",
          message: error.message,
        });
      }
    }
  };

  const handleRate = async (rating: number) => {
    try {
      await rateMovie(movie.id, rating);
      showToast({
        style: Toast.Style.Success,
        title: `Rated ${rating}/5`,
      });
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to rate movie",
          message: error.message,
        });
      }
    }
  };

  const markdown = `
## Synopsis

${movie.synopsis || "No synopsis available."}

${movie.poster ? `\n---\n\n![Poster](${movie.poster})` : ""}
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={movie.title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={movie.user?.status === 1 ? "Watched" : "To Watch"}
            icon={
              movie.user?.status === 1
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : { source: Icon.Clock, tintColor: Color.Orange }
            }
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Year"
            text={String(movie.production_year || "Unknown")}
          />
          {movie.release_date && (
            <Detail.Metadata.Label
              title="Release Date"
              text={movie.release_date}
            />
          )}
          {movie.director && (
            <Detail.Metadata.Label title="Director" text={movie.director} />
          )}
          {movie.length && (
            <Detail.Metadata.Label
              title="Duration"
              text={`${movie.length} min`}
            />
          )}
          <Detail.Metadata.Separator />
          {movie.genres && movie.genres.length > 0 && (
            <Detail.Metadata.TagList title="Genres">
              {movie.genres.map((genre) => (
                <Detail.Metadata.TagList.Item key={genre} text={genre} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          {movie.vote_average && (
            <Detail.Metadata.Label
              title="Rating"
              text={`${movie.vote_average}/10`}
              icon={Icon.Star}
            />
          )}
          {movie.vote_count > 0 && (
            <Detail.Metadata.Label
              title="Votes"
              text={String(movie.vote_count)}
            />
          )}
          {movie.original_title !== movie.title && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Original Title"
                text={movie.original_title}
              />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {movie.user?.status !== 1 ? (
            <Action
              title="Mark as Watched"
              icon={Icon.CheckCircle}
              onAction={handleMarkAsWatched}
            />
          ) : (
            <Action
              title="Mark as Unwatched"
              icon={Icon.Clock}
              onAction={handleMarkAsUnwatched}
            />
          )}
          <ActionPanel.Section title="Rate Movie">
            <Action
              title="Rate 1 ⭐"
              icon={Icon.Star}
              onAction={() => handleRate(1)}
            />
            <Action
              title="Rate 2 ⭐⭐"
              icon={Icon.Star}
              onAction={() => handleRate(2)}
            />
            <Action
              title="Rate 3 ⭐⭐⭐"
              icon={Icon.Star}
              onAction={() => handleRate(3)}
            />
            <Action
              title="Rate 4 ⭐⭐⭐⭐"
              icon={Icon.Star}
              onAction={() => handleRate(4)}
            />
            <Action
              title="Rate 5 ⭐⭐⭐⭐⭐"
              icon={Icon.Star}
              onAction={() => handleRate(5)}
            />
          </ActionPanel.Section>
          {(movie.url || movie.id) && (
            <ActionPanel.Section>
              <Action.OpenInBrowser
                title="Open in Browser"
                url={movie.url || `https://www.betaseries.com/film/${movie.id}`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
