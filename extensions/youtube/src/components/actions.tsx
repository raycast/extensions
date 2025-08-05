import { Action, Color, Icon } from "@raycast/api";
import { PlaylistList } from "./playlist";
import { addRecentChannel } from "./recent_channels";
import { SearchVideoList } from "./video_search";

export interface ChannelActionProps {
  channelId: string;
  refresh?: () => void;
}

export function OpenChannelInBrowser({ channelId, refresh }: ChannelActionProps) {
  return (
    <Action.OpenInBrowser
      title="Open Channel in Browser"
      url={`https://youtube.com/channel/${channelId}`}
      shortcut={{ modifiers: ["cmd"], key: "b" }}
      onOpen={() => {
        addRecentChannel(channelId);
        if (refresh) refresh();
      }}
    />
  );
}

export function SearchChannelVideosAction({ channelId, refresh }: ChannelActionProps) {
  return (
    <Action.Push
      title="Search Channel Videos"
      target={<SearchVideoList channelId={channelId} />}
      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      icon={{ source: Icon.MagnifyingGlass, tintColor: Color.PrimaryText }}
      onPush={() => {
        addRecentChannel(channelId);
        if (refresh) refresh();
      }}
    />
  );
}

export function ShowRecentPlaylistVideosAction(props: ChannelActionProps & { playlistId?: string; title?: string }) {
  if (props.playlistId) {
    const title = props.title ? props.title : "Show Playlist Videos";
    return (
      <Action.Push
        title={title}
        target={<PlaylistList playlistId={props.playlistId} />}
        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        icon={{ source: Icon.Bubble, tintColor: Color.PrimaryText }}
        onPush={() => {
          addRecentChannel(props.channelId);
          if (props.refresh) props.refresh();
        }}
      />
    );
  }
  return null;
}
