import { Color, Icon, Action } from "@raycast/api";
import { PlaylistList } from "./playlist";
import { SearchVideoList } from "./video_search";
import { Channel } from "../lib/youtubeapi";
import { addRecentChannel } from "./recent_channels";

export function OpenChannelInBrowser(props: { channelId: string | undefined; channel?: Channel }): JSX.Element | null {
  const channelId = props.channelId;
  if (channelId) {
    return (
      <Action.OpenInBrowser
        title="Open Channel in Browser"
        url={`https://youtube.com/channel/${channelId}`}
        shortcut={{ modifiers: ["cmd"], key: "b" }}
        onOpen={async () => {
          if (props.channel) {
            await addRecentChannel(props.channel);
          }
        }}
      />
    );
  }
  return null;
}

export function SearchChannelVideosAction(props: { channel: Channel }): JSX.Element | null {
  const cid = props.channel.id;
  if (cid) {
    return (
      <Action.Push
        title="Search Channel Videos"
        target={<SearchVideoList channedId={cid} />}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
        icon={{ source: Icon.MagnifyingGlass, tintColor: Color.PrimaryText }}
        onPush={async () => await addRecentChannel(props.channel)}
      />
    );
  }
  return null;
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
        onPush={async () => await addRecentChannel(props.channel)}
      />
    );
  }
  return null;
}
