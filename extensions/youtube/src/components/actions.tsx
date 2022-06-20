import { Color, Icon, Action } from "@raycast/api";
import { PlaylistList } from "./playlist";
import { SearchVideoList } from "./video_search";

export function OpenChannelInBrowser(props: { channelId: string | undefined }): JSX.Element | null {
  const channelId = props.channelId;
  if (channelId) {
    return (
      <Action.OpenInBrowser
        title="Open Channel in Browser"
        url={`https://youtube.com/channel/${channelId}`}
        shortcut={{ modifiers: ["cmd"], key: "b" }}
      />
    );
  }
  return null;
}

export function SearchChannelVideosAction(props: { channelId: string | undefined }): JSX.Element | null {
  const cid = props.channelId;
  if (cid) {
    return (
      <Action.Push
        title="Search Channel Videos"
        target={<SearchVideoList channedId={cid} />}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
        icon={{ source: Icon.MagnifyingGlass, tintColor: Color.PrimaryText }}
      />
    );
  }
  return null;
}

export function ShowRecentPlaylistVideosAction(props: {
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
      />
    );
  }
  return null;
}
