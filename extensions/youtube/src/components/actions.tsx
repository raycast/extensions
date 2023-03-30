import { Color, Icon, Action } from "@raycast/api";
import { PlaylistList } from "./playlist";
import { SearchVideoList } from "./video_search";
import { Channel } from "../lib/youtubeapi";
import { addRecentChannel } from "./recent_channels";

export function OpenChannelInBrowser({ channelId, channel }: { channelId: string | undefined; channel?: Channel }) {
  return channelId ? (
    <Action.OpenInBrowser
      title="Open Channel in Browser"
      url={`https://youtube.com/channel/${channelId}`}
      shortcut={{ modifiers: ["cmd"], key: "b" }}
      onOpen={() => {
        if (channel) {
          addRecentChannel(channel);
        }
      }}
    />
  ) : null;
}

export function SearchChannelVideosAction({ channel }: { channel: Channel }) {
  return (
    <Action.Push
      title="Search Channel Videos"
      target={<SearchVideoList channelId={channel.id} />}
      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      icon={{ source: Icon.MagnifyingGlass, tintColor: Color.PrimaryText }}
      onPush={() => addRecentChannel(channel)}
    />
  );
}

export function ShowRecentPlaylistVideosAction(props: {
  channel: Channel;
  playlistId: string | undefined;
  title?: string | undefined;
}): JSX.Element | null {
  const pid = props.playlistId;
  if (pid) {
    const title = props.title ? props.title : "Show Playlist Videos";
    return (
      <Action.Push
        title={title}
        target={<PlaylistList playlistId={pid} />}
        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        icon={{ source: Icon.Bubble, tintColor: Color.PrimaryText }}
        onPush={() => addRecentChannel(props.channel)}
      />
    );
  }
  return null;
}
