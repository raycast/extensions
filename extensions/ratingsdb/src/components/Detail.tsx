import { useEffect, useState } from "react";
import { Image, List, Icon, Color, open } from "@raycast/api";
import { MediaDetails, DetailViewProps } from "../types";
import { getRottenTomatoesUrl, getMetacriticUrl, getIMDBUrl, formatDate } from "../utils";

export default function DetailView({ media }: DetailViewProps) {
  const [details, setDetails] = useState<MediaDetails | null>(null);

  useEffect(() => {
    setDetails(media);
  }, [media]);

  if (!details) {
    return <List.Item.Detail markdown="No details found." />;
  }

  return (
    <List.Item.Detail
      markdown={`
# ${media.Title} (${media.Year})
<img src="${media.Poster}" height="140"/>
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
            {media.Ratings[1]?.Value && (
              <List.Item.Detail.Metadata.TagList.Item
                text={`🍅 Rotten Tomatoes ${media.Ratings[1].Value}`}
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

          {details.Director !== "N/A" && (
            <List.Item.Detail.Metadata.Label title="Director" text={details.Director} icon={Icon.Video} />
          )}
          {details.Writer !== "N/A" && (
            <List.Item.Detail.Metadata.Label title="Writers" text={details.Writer} icon={Icon.Pencil} />
          )}
          {details.Released && (
            <List.Item.Detail.Metadata.Label
              title="Release Date"
              text={formatDate(details.Released)}
              icon={Icon.Calendar}
            />
          )}
          {media.Type === "movie" && (
            <>
              <List.Item.Detail.Metadata.Label title="Runtime" text={details.Runtime} icon={"runtime.png"} />
              <List.Item.Detail.Metadata.Label title="Box Office" text={details.BoxOffice} icon={"box-office.png"} />
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
