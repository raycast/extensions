import { List } from "@raycast/api";
import { ExtendedAnime } from "../api/api";
import { statusToText } from "./manage-watchlist/utils";

const capitalizeFirstLetter = (val: string) => val.charAt(0).toUpperCase() + val.slice(1);

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
      return capitalizeFirstLetter(media);
  }
}

export default function AnimeDetails({ anime }: { anime: ExtendedAnime }) {
  const startYear = anime.start_date ? new Date(anime.start_date).getFullYear().toString() : "-";

  return (
    <List.Item.Detail
      markdown={`## ${anime.title}\n<img src="${anime.main_picture.large}" height="200"/>\n\n${anime.synopsis || ""}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="English Title" text={anime.title} />
          <List.Item.Detail.Metadata.Label title="Type" text={mediaTypeToString(anime.media_type)} />
          <List.Item.Detail.Metadata.Label
            title="Episodes"
            text={anime.num_episodes > 0 ? anime.num_episodes.toString() : "-"}
          />
          <List.Item.Detail.Metadata.Label title="Score" text={anime.mean?.toString() || "-"} />
          <List.Item.Detail.Metadata.Label title="Ranked" text={anime.rank ? `#${anime.rank?.toString()}` : "-"} />
          <List.Item.Detail.Metadata.Label title="Year" text={startYear} />
          <List.Item.Detail.Metadata.Label title="Status" text={statusToText(anime.status)} />
          <List.Item.Detail.Metadata.TagList title="Genres">
            {(anime?.genres || []).map((genre) => (
              <List.Item.Detail.Metadata.TagList.Item text={genre.name} color={"#E2E7F4"} key={genre.name} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
}
