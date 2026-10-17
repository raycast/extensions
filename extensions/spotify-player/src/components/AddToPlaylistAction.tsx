import { Action, Icon } from "@raycast/api";
import { AddToPlaylist } from "../shortcuts/shortcuts";
import { PlaylistPicker } from "./PlaylistPicker";

export function AddToPlaylistAction({ uri }: { uri: string }) {
  return (
    <Action.Push
      icon={Icon.List}
      title="Add to Playlist"
      shortcut={AddToPlaylist}
      target={<PlaylistPicker uri={uri} />}
    />
  );
}
