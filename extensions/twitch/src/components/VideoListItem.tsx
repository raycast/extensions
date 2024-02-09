import millify from "millify";
import { memo, useMemo } from "react";

import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";

import { ActionWatchStream, primaryActionBrowser, primaryActionStreamlink } from "@/helpers/action";
import { formatISODuration, formatLongAgo } from "@/helpers/datetime";
import { renderDetails } from "@/helpers/renderDetails";
import type { Video } from "@/interfaces/Video";

function VideoListItemF({ video, onAction }: { video: Video; onAction?: () => void }) {
  const type = useMemo(
    () =>
      video.type === "archive"
        ? "VOD"
        : video.type === "highlight"
          ? "Highlight"
          : video.type === "upload"
            ? "Upload"
            : "Video",
    [video.type],
  );

  const icon = useMemo(
    () =>
      video.type === "archive"
        ? Icon.Video
        : video.type === "highlight"
          ? Icon.Bolt
          : video.type === "upload"
            ? Icon.FilmStrip
            : Icon.Video,
    [video.type],
  );

  const { accessoryIcon, accessoryText } = useMemo(
    () => ({
      accessoryIcon: { source: icon },
      accessoryText: type,
    }),
    [icon, type],
  );

  const browserAction = useMemo(
    () => (
      <Action.OpenInBrowser title={`Open ${type} in Browser`} url={video.url} onOpen={onAction} icon={accessoryIcon} />
    ),
    [type, video.url, onAction, accessoryIcon],
  );

  const streamlinkAction = useMemo(
    () => <ActionWatchStream title={`Watch ${type}`} name={video.url} onAction={onAction} icon={accessoryIcon} />,
    [type, video.url, onAction, accessoryIcon],
  );

  return (
    <List.Item
      id={video.id}
      title={video.title}
      subtitle={video.description}
      accessories={[{ icon: accessoryIcon, text: accessoryText }]}
      detail={
        <List.Item.Detail
          markdown={renderDetails(video)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title={video.title} />
              <List.Item.Detail.Metadata.Label title="Type" icon={accessoryIcon} text={accessoryText} />
              <List.Item.Detail.Metadata.Label
                title="Duration"
                text={formatISODuration(video.duration)}
                icon={{ source: Icon.Clock, tintColor: Color.Blue }}
              />
              <List.Item.Detail.Metadata.Label
                title="Published On"
                text={formatLongAgo(video.published_at)}
                icon={{ source: Icon.Clock, tintColor: Color.Blue }}
              />
              {video.description && <List.Item.Detail.Metadata.Label title={video.description} />}

              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.Label
                title="Viewer Count"
                text={millify(video.view_count)}
                icon={{ source: Icon.Person, tintColor: Color.Red }}
              />
              <List.Item.Detail.Metadata.Label
                title="Language"
                text={video.language}
                icon={{ source: Icon.SpeechBubble, tintColor: Color.Yellow }}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {primaryActionBrowser && browserAction}
          {streamlinkAction}
          {primaryActionStreamlink && browserAction}
        </ActionPanel>
      }
    />
  );
}

const VideoListItem = memo(VideoListItemF);

export default VideoListItem;
