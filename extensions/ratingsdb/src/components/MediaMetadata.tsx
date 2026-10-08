import { Detail, Color, Image, open, Icon } from "@raycast/api";
import { MediaDetails, StreamingProvider } from "../types";
import { getRottenTomatoesUrl, getIMDBUrl, getMetacriticUrl, getProviderIcon } from "../utils";

export const MediaMetadata = ({
  media,
  providers,
  providersLoading,
}: {
  media: MediaDetails;
  providers?: StreamingProvider[];
  providersLoading: boolean;
}) => {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Title" text={media.Title} />

      <Detail.Metadata.Separator />

      <Detail.Metadata.TagList title="Links">
        {media.imdbID && (
          <Detail.Metadata.TagList.Item
            text={`IMDb ${media.imdbRating}★ - ${media.imdbVotes} votes`}
            color={Color.Yellow}
            onAction={() => open(getIMDBUrl(media))}
            icon={{ source: "IMDB.png" }}
          />
        )}
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
          text="Cast"
          color={Color.Green}
          onAction={() => open(`https://www.imdb.com/title/${media.imdbID}/fullcredits`)}
          icon={{ source: Icon.ArrowNe }}
        />
        <Detail.Metadata.TagList.Item
          text="Google"
          color={Color.Blue}
          onAction={() =>
            open(`https://www.google.com/search?q=${encodeURIComponent(media.Title)}+${media.Type.toLowerCase()}`)
          }
          icon={{ source: Icon.ArrowNe }}
        />
      </Detail.Metadata.TagList>

      <Detail.Metadata.Separator />

      {providers && providers.length > 0 ? (
        <Detail.Metadata.TagList title="Where you can purchase or stream">
          {providers.map((provider) => (
            <Detail.Metadata.TagList.Item
              key={provider.name}
              text={`${provider.name} (${provider.type === "rent" ? provider.price : `${provider.type}`})`}
              color={provider.type === "free" ? Color.Green : provider.type === "sub" ? Color.Blue : Color.Orange}
              onAction={() => open(provider.web_url)}
              icon={{ source: getProviderIcon(provider), mask: Image.Mask.RoundedRectangle }}
            />
          ))}
        </Detail.Metadata.TagList>
      ) : providersLoading ? (
        <Detail.Metadata.Label title="Streaming Options" text="Loading streaming options..." />
      ) : (
        <Detail.Metadata.Label
          title="Streaming Options"
          text={
            providers
              ? "No streaming providers available for this title"
              : "Error fetching providers, check your API key in Raycast settings"
          }
        />
      )}
    </Detail.Metadata>
  );
};
