import React from "react";
import { Detail, Color, Icon, open, Image } from "@raycast/api";
import { Episode, MediaDetails, StreamingProvider } from "../types";
import { getIMDBUrl, getRottenTomatoesUrl, getMetacriticUrl } from "../utils";

interface EpisodeMetadataProps {
  episode: Episode;
  media: MediaDetails;
  providers: StreamingProvider[];
}

export const EpisodeMetadata: React.FC<EpisodeMetadataProps> = ({ episode, media, providers }) => {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Episode Title" text={episode.Title} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.TagList title="Links">
        <Detail.Metadata.TagList.Item
          text={`IMDb ${episode.imdbRating}★`}
          color={Color.Yellow}
          onAction={() => open(getIMDBUrl({ ...media, imdbID: episode.imdbID } as MediaDetails))}
          icon={{ source: "IMDB.png" }}
        />
        <Detail.Metadata.TagList.Item
          text="Cast"
          color={Color.Green}
          onAction={() => open(`https://www.imdb.com/title/${media.imdbID}/fullcredits`)}
          icon={{ source: Icon.ArrowNe }}
        />
        <Detail.Metadata.TagList.Item
          text={`🍅 Rotten Tomatoes ${media.Ratings?.find((r) => r.Source === "Rotten Tomatoes")?.Value || ""}`}
          color={Color.Red}
          onAction={() => open(getRottenTomatoesUrl(media))}
        />
        {media.Metascore && (
          <Detail.Metadata.TagList.Item
            text={`Metacritic ${media.Metascore !== "N/A" ? media.Metascore : ""}`}
            color={Color.Purple}
            onAction={() => open(getMetacriticUrl(media))}
            icon={{ source: "metacritic.png", mask: Image.Mask.RoundedRectangle }}
          />
        )}
        <Detail.Metadata.TagList.Item
          text="Google"
          color={Color.Blue}
          onAction={() =>
            open(
              `https://www.google.com/search?q=${encodeURIComponent(media.Title)}+${media.Type.toLowerCase()}+episode+${episode.Episode.toString()}`,
            )
          }
          icon={{ source: "google.png", mask: Image.Mask.Circle }}
        />
        <Detail.Metadata.TagList.Item
          text="Reddit"
          color={Color.Orange}
          onAction={() =>
            open(
              `https://www.reddit.com/search/?q=${encodeURIComponent(media.Title)}+${media.Type.toLowerCase()}+episode+${episode.Episode.toString()}`,
            )
          }
          icon={{ source: "reddit.png", mask: Image.Mask.Circle }}
        />
      </Detail.Metadata.TagList>

      <Detail.Metadata.Separator />
      {media.Genre && <Detail.Metadata.Label title="Genre" text={media.Genre} />}

      <Detail.Metadata.Separator />

      {providers.length > 0 && (
        <Detail.Metadata.TagList title="Where you can purchase or stream">
          {providers.map((provider) => (
            <Detail.Metadata.TagList.Item
              key={provider.name}
              text={`${provider.name} (${provider.type === "rent" ? provider.price : `${provider.type}`})`}
              color={provider.type === "free" ? Color.Green : provider.type === "sub" ? Color.Blue : Color.Orange}
              onAction={() => open(provider.web_url)}
            />
          ))}
        </Detail.Metadata.TagList>
      )}
    </Detail.Metadata>
  );
};
