import { Action, ActionPanel, Image, List } from "@raycast/api";
import { PlaylistDetailed } from "ytmusic-api";
import { formatText } from "../helpers/formatText";
import { ActionType } from "./actionType";
import { TEXT_TRUCATE_LENGTH } from "../songs";

type PlaylistSectionProps = {
  data: PlaylistDetailed[];
};

export const PlaylistSection = ({ data }: PlaylistSectionProps) => {
  if (!data) {
    return null;
  }

  return (
    <List.Section title="Playlists">
      {data.map((playlist) => (
        <PlaylistItem pList={playlist} key={playlist.playlistId} />
      ))}
    </List.Section>
  );
};

const PlaylistItem = ({ pList }: { pList: PlaylistDetailed }) => {
  let icon: Image.ImageLike | undefined = undefined;

  if (pList.thumbnails && pList.thumbnails.length > 0) {
    icon = {
      source: pList.thumbnails[pList.thumbnails.length - 1]?.url,
    };
  }

  const url = `https://music.youtube.com/playlist?list=${pList.playlistId}`;
  return (
    <List.Item
      icon={icon}
      title={formatText(pList.name, TEXT_TRUCATE_LENGTH)}
      subtitle={pList.artist.name}
      actions={
        <ActionPanel>
          <ActionType
            {...{
              url,
              title: `View ${pList.name}`,
            }}
          />
          <Action.CopyToClipboard content={url} />
        </ActionPanel>
      }
    />
  );
};
