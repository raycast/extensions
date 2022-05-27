import { Action, ActionPanel, getPreferenceValues, Icon, Keyboard, List } from "@raycast/api";
import { useMemo } from "react";
import { ClipItem } from "../clips";
import { Video } from "../lib/interfaces";
import { Details } from "./Details";

function RelatedClips({ title, clips }: { title: string; clips: Video[] }) {
  return (
    <List isShowingDetail navigationTitle={title}>
      <List.Section title="Clips" subtitle={clips.length + ""}>
        {clips.map((video) => (
          <ClipItem key={video.videoId} video={video} />
        ))}
      </List.Section>
    </List>
  );
}

export function Actions({ video, isInDetail = false }: { video: Video; isInDetail?: boolean }) {
  const { videoId, channelId, channelName } = video;

  const prefs = getPreferenceValues();
  const preferYouTube = prefs["prefer-youtube"];

  const primaryShortcut = useMemo<Keyboard.Shortcut>(() => ({ modifiers: ["cmd"], key: "enter" }), []);
  const secondaryShortcut = useMemo<Keyboard.Shortcut>(() => ({ modifiers: ["cmd"], key: "." }), []);

  const holodexUrl = `https://holodex.net/watch/${videoId}`;
  const holodexChannelUrl = `https://holodex.net/channel/${channelId}`;
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const youtubeChannelUrl = `https://www.youtube.com/channel/${channelId}`;

  const Holodex = ({ shortcut }: { shortcut?: Keyboard.Shortcut }) => (
    <Action.OpenInBrowser
      title="Open in Holodex"
      url={holodexUrl}
      icon={{ source: "holodex.png" }}
      shortcut={shortcut}
    />
  );

  const YouTube = ({ shortcut }: { shortcut?: Keyboard.Shortcut }) => (
    <Action.OpenInBrowser title="Open in YouTube" url={youtubeUrl} icon={{ source: "yt.png" }} shortcut={shortcut} />
  );

  const HolodexChannel = () => (
    <Action.OpenInBrowser title="Open Channel in Holodex" url={holodexChannelUrl} icon={{ source: "holodex.png" }} />
  );

  const YouTubeChannel = () => (
    <Action.OpenInBrowser title="Open Channel in YouTube" url={youtubeChannelUrl} icon={{ source: "yt.png" }} />
  );

  return (
    <>
      <ActionPanel.Section>
        {!isInDetail && <Action.Push title="Show Details" icon={Icon.TextDocument} target={<Details {...video} />} />}
        {preferYouTube ? (
          <>
            <YouTube shortcut={primaryShortcut} />
            <Holodex shortcut={secondaryShortcut} />
          </>
        ) : (
          <>
            <Holodex shortcut={primaryShortcut} />
            <YouTube shortcut={secondaryShortcut} />
          </>
        )}
        {video.clips && (
          <Action.Push
            title="Related Clips"
            target={<RelatedClips title={`Clips for ${video.title}`} clips={video.clips} />}
            icon={Icon.MagnifyingGlass}
            shortcut={{ key: ".", modifiers: ["cmd", "shift"] }}
          />
        )}
        <Action.CopyToClipboard
          content={preferYouTube ? youtubeUrl : holodexUrl}
          title="Copy Video URL"
          shortcut={{ key: "c", modifiers: ["cmd", "shift"] }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title={`Channel: ${channelName}`}>
        {preferYouTube ? (
          <>
            <YouTubeChannel />
            <HolodexChannel />
          </>
        ) : (
          <>
            <HolodexChannel />
            <YouTubeChannel />
          </>
        )}
        <Action.CopyToClipboard
          content={preferYouTube ? youtubeChannelUrl : holodexChannelUrl}
          title="Copy Channel URL"
          shortcut={{ key: "c", modifiers: ["cmd", "ctrl"] }}
        />
      </ActionPanel.Section>
    </>
  );
}
