import { List, Icon } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getPlaylists } from "./api";
import { FetchEmptyView, PlaylistItem } from "./components";

export default function PlaylistsCommand() {
  const { data, isLoading, error } = useCachedPromise(getPlaylists, [], {
    onError: (err) => {
      showFailureToast(err, { title: "Failed to load playlists" });
    },
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter playlists...">
      {!data || data.length === 0 ? (
        <FetchEmptyView
          error={error}
          isLoading={isLoading}
          errorTitle="Could Not Load Playlists"
          emptyIcon={Icon.List}
          emptyTitle="No Playlists Found"
          emptyDescription="Create a playlist in Navidrome to see it here"
        />
      ) : (
        data.map((playlist) => (
          <PlaylistItem key={playlist.id} playlist={playlist} />
        ))
      )}
    </List>
  );
}
