import { Action, ActionPanel, Image, List } from "@raycast/api";
import { VideoDetailed } from "ytmusic-api";
import { formatDuration } from "../helpers/formatDuration";
import { formatText } from "../helpers/formatText";
import { TEXT_TRUCATE_LENGTH } from "../songs";
import { ActionType } from "./actionType";

type VideoSectionProps = {
  data: VideoDetailed[];
};

export const VideoSection = ({ data }: VideoSectionProps) => {
  if (!data) {
    return null;
  }

  return (
    <List.Section title="Videos">
      {data.map((video) => (
        <VideoItem key={video.videoId} video={video} />
      ))}
    </List.Section>
  );
};

const VideoItem = ({ video }: { video: VideoDetailed }) => {
  let icon: Image.ImageLike | undefined = undefined;

  if (video.thumbnails && video.thumbnails.length > 0) {
    icon = {
      source: video.thumbnails[video.thumbnails.length - 1]?.url,
    };
  }

  const url = `https://music.youtube.com/watch?v=${video.videoId}`;
  return (
    <List.Item
      icon={icon}
      title={formatText(video.name, TEXT_TRUCATE_LENGTH)}
      subtitle={video.artist.name}
      accessories={[{ text: video.duration ? `${formatDuration(video.duration || 0)}` : undefined }]}
      actions={
        <ActionPanel>
          <ActionType
            {...{
              url,
              title: `Play ${video.name}`,
            }}
          />
          <Action.CopyToClipboard content={url} />
        </ActionPanel>
      }
    />
  );
};
