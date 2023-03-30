import { List, showToast, Toast } from "@raycast/api";
import { useGetLikedSongs } from "./spotify/client";
import { SpotifyProvider } from "./utils/context";
import TrackListItem from "./components/TrackListItem";

function LikedSongs() {
  const response = useGetLikedSongs();


  if (response.error) {
    showToast(Toast.Style.Failure, "Search has failed", response.error);
  }
  const tracks = response.result?.items

  return (
    <List
      navigationTitle="Search Liked Songs"
      searchBarPlaceholder="Search music by keywords..."
      isLoading={response.isLoading}
      throttle
      isShowingDetail={false}
    >
      {tracks &&
        tracks
          .sort((t) => t.track.popularity)
          .map((t) => <TrackListItem key={t.track.id} track={t.track} album={t.track.album} />)}
    </List>
  );
}

export default () => (
  <SpotifyProvider>
    <LikedSongs />
  </SpotifyProvider>
);
