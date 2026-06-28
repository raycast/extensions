import { Detail, ActionPanel, Action } from "@raycast/api";
import { ExtendedAnime } from "../../api/api";

interface AnimeDetailProps {
  anime: ExtendedAnime;
}

function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null) return "-";
  return num.toLocaleString();
}

function formatSeason(season: string | undefined): string {
  if (!season) return "";
  return season.charAt(0).toUpperCase() + season.slice(1);
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds) return "-";
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min. per ep.`;
}

function formatBroadcast(broadcast: { day_of_the_week: string; start_time?: string } | undefined): string {
  if (!broadcast) return "-";
  const day = broadcast.day_of_the_week.charAt(0).toUpperCase() + broadcast.day_of_the_week.slice(1);
  if (broadcast.start_time) {
    return `${day}s at ${broadcast.start_time} (JST)`;
  }
  return `${day}s`;
}

type MediaType = "tv" | "movie" | "tv_special" | "ova" | "ona";

function mediaTypeToString(media: MediaType | string) {
  switch (media) {
    case "tv":
      return "TV Series";
    case "movie":
      return "Movie";
    case "tv_special":
      return "TV Special";
    case "ova":
      return "OVA";
    case "ona":
      return "ONA";
    default:
      return media.charAt(0).toUpperCase() + media.slice(1);
  }
}

function statusToText(status: string): string {
  switch (status) {
    case "finished_airing":
      return "Finished Airing";
    case "currently_airing":
      return "Currently Airing";
    case "not_yet_aired":
      return "Not Yet Aired";
    default:
      return status;
  }
}

export default function AnimeDetail({ anime }: AnimeDetailProps) {
  const startDate = anime.start_date ?? "-";
  const endDate = anime.end_date ?? "-";
  const studios = anime.studios?.map((s) => s.name).join(", ") || "-";
  const premiered =
    anime.start_season?.season && anime.start_season?.year
      ? `${formatSeason(anime.start_season.season)} ${anime.start_season.year}`
      : "-";
  const broadcast = formatBroadcast(anime.broadcast);
  const duration = formatDuration(anime.average_episode_duration);
  const scoreText = anime.mean ? `${anime.mean} (scored by ${formatNumber(anime.num_scoring_users)} users)` : "-";

  const markdown = `
## ${anime.title}

<img src="${anime.main_picture.large}" height="400"/>

${anime.synopsis || ""}
  `.trim();

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {/* Statistics */}
          <Detail.Metadata.Label title="Score" text={scoreText} />
          <Detail.Metadata.Label title="Ranked" text={anime.rank ? `#${formatNumber(anime.rank)}` : "-"} />
          <Detail.Metadata.Label
            title="Popularity"
            text={anime.popularity ? `#${formatNumber(anime.popularity)}` : "-"}
          />
          <Detail.Metadata.Label title="Members" text={formatNumber(anime.num_list_users)} />
          <Detail.Metadata.Separator />
          {/* Information */}
          <Detail.Metadata.Label title="Type" text={mediaTypeToString(anime.media_type)} />
          <Detail.Metadata.Label title="Episodes" text={anime.num_episodes > 0 ? anime.num_episodes.toString() : "-"} />
          <Detail.Metadata.Label title="Status" text={statusToText(anime.status)} />
          <Detail.Metadata.Label title="Aired From" text={startDate} />
          <Detail.Metadata.Label title="Aired To" text={endDate} />
          <Detail.Metadata.Label title="Premiered" text={premiered} />
          <Detail.Metadata.Label title="Broadcast" text={broadcast} />
          <Detail.Metadata.Label title="Duration" text={duration} />
          <Detail.Metadata.Label title="Source" text={anime.source || "-"} />
          <Detail.Metadata.Separator />

          {/* Production */}
          <Detail.Metadata.Label title="Studios" text={studios} />
          <Detail.Metadata.Separator />

          {/* Genres */}
          <Detail.Metadata.TagList title="Genres">
            {(anime.genres || []).map((genre) => (
              <Detail.Metadata.TagList.Item text={genre.name} color="#E2E7F4" key={genre.id} />
            ))}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://myanimelist.net/anime/${anime.id}`} />
        </ActionPanel>
      }
    />
  );
}
