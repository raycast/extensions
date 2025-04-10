import { Detail, ActionPanel, Action } from "@raycast/api";
// Remove showToast and Toast from imports since they're not used
import { MovieResult } from "../types";
import { RequestForm } from "./RequestForm";

const getStatusBadge = (status?: number) => {
  switch (status) {
    case 1:
      return { text: "UNKNOWN", color: "secondary" };
    case 2:
      return { text: "REQUESTED", color: "yellow" };
    case 3:
      return { text: "PENDING", color: "yellow" };
    case 4:
      return { text: "PARTIALLY AVAILABLE", color: "orange" };
    case 5:
      return { text: "AVAILABLE", color: "green" };
    default:
      return { text: "NOT REQUESTED", color: "red" };
  }
};

const formatBytes = (bytes?: number) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

const isMediaRequested = (mediaInfo?: MediaInfo) => {
  if (!mediaInfo) return false;
  return [2, 3, 4, 5].includes(mediaInfo.status);
};

export function MovieDetail({ movie }: { movie: MovieResult }) {
  const title = movie.title || movie.name || "Unknown Title";
  const releaseDate = movie.releaseDate || movie.firstAirDate || "";
  const year = releaseDate ? new Date(releaseDate).getFullYear() : "";
  const rating = typeof movie.voteAverage === "number" ? `⭐ ${movie.voteAverage.toFixed(1)}` : "";

  const posterUrl = movie.posterPath ? `https://image.tmdb.org/t/p/w780${movie.posterPath}` : null;

  const markdown = posterUrl ? `![${title}](${posterUrl})` : "";

  const mediaInfo = movie.mediaInfo;
  const downloadStatus = mediaInfo?.downloadStatus?.[0];
  const status = getStatusBadge(mediaInfo?.status);
  const status4k = getStatusBadge(mediaInfo?.status4k);

  return (
    <Detail
      navigationTitle={title}
      markdown={markdown}
      actions={
        <ActionPanel>
          {!isMediaRequested(movie.mediaInfo) && (
            <Action.Push title="Request Media" target={<RequestForm movie={movie} />} />
          )}
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Info">
            <Detail.Metadata.TagList.Item text={movie.mediaType.toUpperCase()} color="purple" />
            {rating && <Detail.Metadata.TagList.Item text={rating} color="yellow" />}
            {year && <Detail.Metadata.TagList.Item text={year.toString()} color="blue" />}
          </Detail.Metadata.TagList>

          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={status.text} color={status.color} />
            <Detail.Metadata.TagList.Item text={`4K: ${status4k.text}`} color={status4k.color} />
          </Detail.Metadata.TagList>

          {downloadStatus && (
            <>
              <Detail.Metadata.Separator />

              <Detail.Metadata.Label title="Download Title" text={downloadStatus.title} />
              <Detail.Metadata.Label title="Status" text={downloadStatus.status.toUpperCase()} />
              <Detail.Metadata.Label
                title="Progress"
                text={`${((1 - downloadStatus.sizeLeft / downloadStatus.size) * 100).toFixed(1)}%`}
              />
              <Detail.Metadata.Label title="Size" text={formatBytes(downloadStatus.size)} />
              <Detail.Metadata.Label title="Remaining" text={formatBytes(downloadStatus.sizeLeft)} />
              <Detail.Metadata.Label title="Time Left" text={downloadStatus.timeLeft} />
              <Detail.Metadata.Label
                title="Estimated Completion"
                text={new Date(downloadStatus.estimatedCompletionTime).toLocaleString()}
              />
            </>
          )}

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title="Title" text={title} />
          {releaseDate && <Detail.Metadata.Label title="Release Date" text={releaseDate} />}
          <Detail.Metadata.Label title="Popularity" text={movie.popularity?.toFixed(1) || "N/A"} />
          <Detail.Metadata.Label title="Vote Count" text={movie.voteCount?.toString() || "0"} />
          <Detail.Metadata.Label title="Language" text={movie.originalLanguage?.toUpperCase() || "Unknown"} />

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title="Overview" text={movie.overview || "No overview available"} />
        </Detail.Metadata>
      }
    />
  );
}
