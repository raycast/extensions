import { Action, ActionPanel, Image, List } from "@raycast/api";
import { SongDetailed } from "ytmusic-api";
import { formatDuration } from "../helpers/formatDuration";
import { formatText } from "../helpers/formatText";
import { TEXT_TRUCATE_LENGTH } from "../songs";
import { ActionType } from "./actionType";

type TrackSectionProps = {
  data: SongDetailed[];
};

export const TrackSection = ({ data }: TrackSectionProps) => {
  if (!data) {
    return null;
  }

  return (
    <List.Section title="Songs">
      {data.map((track) => (
        <TrackItem track={track} key={track.videoId} />
      ))}
    </List.Section>
  );
};

const TrackItem = ({ track }: { track: SongDetailed }) => {
  let icon: Image.ImageLike | undefined = undefined;

  if (track.thumbnails && track.thumbnails.length > 0) {
    icon = {
      source: track.thumbnails[track.thumbnails.length - 1]?.url,
    };
  }

  const url = `https://music.youtube.com/watch?v=${track.videoId}`;
  return (
    <List.Item
      icon={icon}
      title={formatText(track.name, TEXT_TRUCATE_LENGTH)}
      subtitle={track.artist.name}
      accessories={[{ text: track.duration ? `${formatDuration(track.duration || 0)}` : undefined }]}
      actions={
        <ActionPanel>
          <ActionType
            {...{
              url,
              title: `Play ${track.name}`,
            }}
          />
          <Action.CopyToClipboard content={url} />
        </ActionPanel>
      }
    />
  );
};
