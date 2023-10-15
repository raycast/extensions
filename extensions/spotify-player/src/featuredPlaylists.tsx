import { List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { useGetFeaturedPlaylists } from "./spotify/client";
import PlaylistItem from "./components/PlaylistListItem";
import { SpotifyProvider } from "./utils/context";

function FeaturedPlaylists() {
  const response = useGetFeaturedPlaylists();

  if (response.error) {
    showToast(Toast.Style.Failure, "Search has failed", response.error);
  }

  return (
    <List isLoading={response.isLoading} throttle>
      {response.result?.playlists.items.map((p) => (
        <PlaylistItem key={p.id} playlist={p} />
      ))}
    </List>
  );
}

export default () => (
  <SpotifyProvider>
    <FeaturedPlaylists />
  </SpotifyProvider>
);
