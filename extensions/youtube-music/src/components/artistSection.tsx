import { Action, ActionPanel, Image, List } from "@raycast/api";
import { ArtistDetailed } from "ytmusic-api";
import { ActionType } from "./actionType";

type ArtistSectionProps = {
  data: ArtistDetailed[];
};

export const ArtistSection = ({ data }: ArtistSectionProps) => {
  if (!data) {
    return null;
  }

  return (
    <List.Section title="Artists">
      {data.map((artist, index) => (
        <ArtistItem key={index} artist={artist} />
      ))}
    </List.Section>
  );
};

const ArtistItem = ({ artist }: { artist: ArtistDetailed }) => {
  let icon: Image.ImageLike | undefined = undefined;

  if (artist.thumbnails && artist.thumbnails.length > 0) {
    icon = {
      source: artist.thumbnails[artist.thumbnails.length - 1]?.url,
    };
  }

  const url = `https://music.youtube.com/channel/${artist.artistId}`;

  return (
    <List.Item
      icon={icon}
      title={artist.name}
      subtitle={artist.name}
      actions={
        <ActionPanel>
          <ActionType
            {...{
              url,
              title: `View ${artist.name} channel`,
            }}
          />
          <Action.CopyToClipboard content={url} />
        </ActionPanel>
      }
    />
  );
};
