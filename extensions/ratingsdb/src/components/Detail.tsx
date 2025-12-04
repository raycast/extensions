import { Image, List, Icon, Color, open } from "@raycast/api";
import { DetailViewProps } from "../types";
import { getRottenTomatoesUrl, getMetacriticUrl, getIMDBUrl, formatDate } from "../utils";

export default function DetailView({ media }: DetailViewProps) {
  if (!media) {
    return <List.Item.Detail markdown="No details found." />;
  }

  return (
    <List.Item.Detail
      markdown={`
<img src="${media.Poster}" height="200"/>
        `}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Ratings">
            <List.Item.Detail.Metadata.TagList.Item
              text={`IMDb ${media.imdbRating}★ `}
              color={Color.Yellow}
              onAction={() => open(getIMDBUrl(media))}
              icon={{ source: "IMDB.png" }}
            />
            {media.Ratings.find((rating) => rating.Source === "Rotten Tomatoes")?.Value && (
              <List.Item.Detail.Metadata.TagList.Item
                text={`🍅 Rotten Tomatoes ${media.Ratings.find((rating) => rating.Source === "Rotten Tomatoes")?.Value}`}
                color={Color.Red}
                onAction={() => open(getRottenTomatoesUrl(media))}
              />
            )}
            {media.Metascore !== "N/A" && (
              <List.Item.Detail.Metadata.TagList.Item
                text={`Metacritic ${media.Metascore}`}
                color={Color.Purple}
                onAction={() => open(getMetacriticUrl(media))}
                icon={{ source: "metacritic.png", mask: Image.Mask.RoundedRectangle }}
              />
            )}
          </List.Item.Detail.Metadata.TagList>

          {media.Director !== "N/A" && (
            <List.Item.Detail.Metadata.Label title="Director" text={media.Director} icon={Icon.Video} />
          )}
          {media.Writer !== "N/A" && (
            <List.Item.Detail.Metadata.Label title="Writers" text={media.Writer} icon={Icon.Pencil} />
          )}
          {media.Released && (
            <List.Item.Detail.Metadata.Label
              title="Release Date"
              text={formatDate(media.Released)}
              icon={Icon.Calendar}
            />
          )}
          {media.Type === "movie" && (
            <>
              <List.Item.Detail.Metadata.Label title="Runtime" text={media.Runtime} icon={Icon.Clock} />
              <List.Item.Detail.Metadata.Label title="Box Office" text={media.BoxOffice} icon={Icon.BankNote} />
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
