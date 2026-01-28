import { Detail } from "@raycast/api";
import { getBannerUrl, getIMDbUrl, getScreenshotUrl, getTraktUrl } from "./helper";
import {
  TraktEpisodeListItem,
  TraktMovieBaseItem,
  TraktMovieHistoryListItem,
  TraktMovieListItem,
  TraktShowBaseItem,
} from "./schema";

export const formatRuntime = (minutes: number): string => {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours} hour${hours > 1 ? "s" : ""}`;
};

export const getMovieMetadataFields = (movie: TraktMovieBaseItem) => {
  return [
    movie.year && { title: "Year", text: movie.year.toString() },
    movie.tagline && { title: "Tagline", text: movie.tagline },
    movie.updated_at && { title: "Last Updated", text: new Date(movie.updated_at).toLocaleDateString() },
    movie.language && { title: "Language", text: movie.language },
    movie.runtime && { title: "Runtime", text: formatRuntime(movie.runtime) },
    movie.released && { title: "Released", text: new Date(movie.released).toLocaleDateString() },
    movie.certification && { title: "Certification", text: movie.certification },
    movie.genres?.length && { title: "Genres", text: movie.genres.join(", ") },
    movie.country && { title: "Country", text: movie.country },
    movie.rating && { title: "Rating", text: `${movie.rating.toFixed(1)}/10` },
    movie.votes && { title: "Votes", text: movie.votes.toString() },
  ].filter((f): f is { title: string; text: string } => Boolean(f));
};

export const getShowMetadataFields = (show: TraktShowBaseItem) => {
  return [
    show.year && { title: "Year", text: show.year.toString() },
    show.genres?.length && { title: "Genres", text: show.genres.join(", ") },
    show.network && { title: "Network", text: show.network },
  ].filter((f): f is { title: string; text: string } => Boolean(f));
};

export const getEpisodeMetadataFields = (episode: TraktEpisodeListItem) => {
  return [
    episode.first_aired && { title: "First Aired", text: new Date(episode.first_aired).toLocaleDateString() },
    episode.runtime && { title: "Runtime", text: formatRuntime(episode.runtime) },
    episode.rating && { title: "Rating", text: `${episode.rating.toFixed(1)}/10` },
    episode.votes && { title: "Votes", text: episode.votes.toString() },
    episode.number_abs && { title: "Absolute #", text: episode.number_abs.toString() },
    episode.episode_type && episode.episode_type !== "standard" && { title: "Type", text: episode.episode_type },
  ].filter((f): f is { title: string; text: string } => Boolean(f));
};

export const createMovieMarkdown = (movie: TraktMovieBaseItem): string => {
  const posterUrl = getBannerUrl(movie.images, "episode.png");
  const lines = ["", `![Poster](${posterUrl})`, `# ${movie.title}`];
  if (movie.overview) lines.push("", movie.overview);
  return lines.join("\n");
};

export const createEpisodeMarkdown = (episode: TraktEpisodeListItem, show?: TraktShowBaseItem): string => {
  const screenshotUrl = getScreenshotUrl(episode.images, "episode.png");
  const seasonEpisode = `S${episode.season}E${episode.number.toString().padStart(2, "0")}`;
  const lines = [
    "",
    `![Screenshot](${screenshotUrl})`,
    "",
    `# ${episode.title}`,
    show?.title ? `## ${show.title} - ${seasonEpisode}` : `## ${seasonEpisode}`,
  ];
  if (episode.overview) lines.push("", episode.overview);
  return lines.join("\n");
};

export const createMovieMetadata = (
  movie: TraktMovieBaseItem | TraktMovieListItem | TraktMovieHistoryListItem,
): JSX.Element => {
  const movieData = "movie" in movie ? movie.movie : movie;
  const baseFields = getMovieMetadataFields(movieData);
  return (
    <Detail.Metadata>
      {baseFields.length > 0 &&
        baseFields.map((field, index) => <Detail.Metadata.Label key={index} title={field.title} text={field.text} />)}
      {("score" in movie || "plays" in movie || "last_watched_at" in movie) && (
        <>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Personal Stats" text="" />
          {"score" in movie && movie.score && (
            <Detail.Metadata.Label title="Community Score" text={`${movie.score}/10`} />
          )}
          {"plays" in movie && movie.plays && (
            <Detail.Metadata.Label title="Times Watched" text={movie.plays.toString()} />
          )}
          {"last_watched_at" in movie && movie.last_watched_at && typeof movie.last_watched_at === "string" && (
            <Detail.Metadata.Label title="Last Watched" text={new Date(movie.last_watched_at).toLocaleDateString()} />
          )}
        </>
      )}
      {"watched_at" in movie && movie.watched_at && typeof movie.watched_at === "string" && (
        <>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Watched" text={new Date(movie.watched_at).toLocaleDateString()} />
        </>
      )}
      <Detail.Metadata.Separator />
      <Detail.Metadata.Link
        title="View on Trakt"
        text={`trakt.tv/movies/${movieData.ids.slug}`}
        target={getTraktUrl("movies", movieData.ids.slug)}
      />
      <Detail.Metadata.Link
        title="View on IMDb"
        text={`imdb.com/title/${movieData.ids.imdb}`}
        target={getIMDbUrl(movieData.ids.imdb)}
      />
      {movieData.trailer && <Detail.Metadata.Link title="Watch Trailer" text="YouTube" target={movieData.trailer} />}
      {movieData.homepage && (
        <Detail.Metadata.Link title="Official Website" text="Homepage" target={movieData.homepage} />
      )}
    </Detail.Metadata>
  );
};

export const createEpisodeMetadata = (episode: TraktEpisodeListItem, show: TraktShowBaseItem): JSX.Element => {
  const episodeFields = getEpisodeMetadataFields(episode);
  const showFields = getShowMetadataFields(show);
  return (
    <Detail.Metadata>
      {episodeFields.map((field, idx) => (
        <Detail.Metadata.Label key={idx} title={field.title} text={field.text} />
      ))}
      {showFields.length > 0 && <Detail.Metadata.Separator />}
      {showFields.map((field, idx) => (
        <Detail.Metadata.Label key={idx} title={field.title} text={field.text} />
      ))}
      <Detail.Metadata.Separator />
      <Detail.Metadata.Link
        title="View on Trakt"
        text={`trakt.tv/shows/${show.ids.slug}/seasons/${episode.season}/episodes/${episode.number}`}
        target={getTraktUrl("episode", show.ids.slug, episode.season, episode.number)}
      />
      {episode.ids.imdb && (
        <Detail.Metadata.Link
          title="View on IMDb"
          text={`imdb.com/title/${episode.ids.imdb}`}
          target={getIMDbUrl(episode.ids.imdb)}
        />
      )}
    </Detail.Metadata>
  );
};
