import { List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { useGetUserPlaylists } from "./spotify/client";
import PlaylistItem from "./components/PlaylistListItem";
import { SpotifyProvider } from "./utils/context";

function MyPlaylists() {
  const response = useGetUserPlaylists();

  if (response.error) {
    showToast(Toast.Style.Failure, "Playlist search has failed", response.error);
  }

  return (
    <List isLoading={response.isLoading} throttle>
      {response.result?.map((p) => (
        <PlaylistItem key={p.id} playlist={p} />
      ))}
    </List>
  );
}

export default () => (
  <SpotifyProvider>
    <MyPlaylists />
  </SpotifyProvider>
);
