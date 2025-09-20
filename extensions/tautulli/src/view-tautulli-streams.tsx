import { ActionPanel, Action, Icon, List, Detail, Keyboard, Image } from "@raycast/api";
import { Stream } from "./types";
import {
  capitalizeEachWord,
  getPlexUrlOfTitle,
  preferences,
  streamStateIcon,
  streamTypeIcon,
  tautulliApi,
  videoDecision,
} from "./utils";
import { StreamData, useStreamData } from "./hooks/useStreamData";
import useTautulli from "./hooks/useTautulli";

export default function Command() {
  const { isLoading, serverId, sessions } = useTautulli();

  return (
    <List isLoading={isLoading} isShowingDetail={(sessions.length ?? 0) > 0} searchBarPlaceholder="Search streams...">
      <List.EmptyView
        title="It's quiet. Too quiet..."
        description="Tautulli doesn't detect any active streams on your Plex server."
      />
      {sessions.map((stream) => (
        <List.Item
          key={stream.session_id}
          icon={{ source: stream.user_thumb, mask: Image.Mask.Circle }}
          title={stream.user}
          detail={<StreamDetail stream={stream} />}
          accessories={[
            {
              icon: streamTypeIcon(stream.stream_video_decision),
              text: capitalizeEachWord(videoDecision(stream.stream_video_decision)),
            },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Tautulli" url={preferences.tautulliUrl} />
              {!!serverId && (
                <Action.OpenInBrowser title="Open in Plex" url={getPlexUrlOfTitle(serverId, stream.rating_key)} />
              )}
              <Action.Push
                title="Show Artwork"
                target={<Detail markdown={`![poster](${tautulliApi("pms_image_proxy")}&img=${stream.thumb})`} />}
                icon={Icon.Image}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              />
              <Action.CopyToClipboard
                title="Copy Title"
                content={stream.full_title}
                shortcut={Keyboard.Shortcut.Common.CopyName}
              />
              <Action.CopyToClipboard
                // "IP" is a common acronym, so I'll ignore the lint rule for title case
                // eslint-disable-next-line @raycast/prefer-title-case
                title="Copy IP Address"
                content={stream.ip_address_public}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function StreamDetail({ stream }: { stream: Stream }) {
  const streamData = useStreamData(stream);

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="User"
            text={stream.user}
            icon={{ source: stream.user_thumb, mask: Image.Mask.Circle }}
          />
          <List.Item.Detail.Metadata.Label title="Title" text={stream.full_title} />
          {stream.media_type === "episode" && (
            <List.Item.Detail.Metadata.Label
              title="Episode"
              text={`S${stream.parent_media_index} • E${stream.media_index}`}
            />
          )}
          <List.Item.Detail.Metadata.Label title="Progress" text={`${streamData.progress} / ${streamData.duration}`} />
          <List.Item.Detail.Metadata.Label
            title="State"
            text={capitalizeEachWord(stream.state)}
            icon={streamStateIcon(stream.state)}
          />

          <List.Item.Detail.Metadata.Separator />

          <StreamInfo streamData={streamData} />

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Platform" text={capitalizeEachWord(stream.platform)} />
          <List.Item.Detail.Metadata.Label title="Product" text={capitalizeEachWord(stream.product)} />
          <List.Item.Detail.Metadata.Label
            title="Location"
            text={`${stream.location.toUpperCase()}: ${stream.ip_address_public}`}
            icon={stream.secure ? Icon.Lock : Icon.LockDisabled}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function StreamInfo({ streamData }: { streamData: StreamData }) {
  const { streamBitrateText, transcodeSpeedLabel, isTranscoding, videoText, audioText, stream } = streamData;

  return (
    <>
      <List.Item.Detail.Metadata.Label title="Stream bitrate" text={streamBitrateText} />
      <List.Item.Detail.Metadata.Label
        title="Stream type"
        text={capitalizeEachWord(videoDecision(stream.stream_video_decision)) + transcodeSpeedLabel}
        icon={streamTypeIcon(stream.stream_video_decision)}
      />
      {isTranscoding && (
        <>
          <List.Item.Detail.Metadata.Label
            title="Container"
            text={`${stream.container} → ${stream.stream_container}`}
          />
          <List.Item.Detail.Metadata.Label title="Video" text={videoText} />
          <List.Item.Detail.Metadata.Label title="Audio" text={audioText} />
        </>
      )}
    </>
  );
}
