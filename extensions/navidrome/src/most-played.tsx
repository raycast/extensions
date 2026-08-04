import { ActionPanel, Action, Grid, Icon } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  getMostPlayed,
  getCoverArtUrl,
  getNavidromeWebUrl,
  type Album,
} from "./api";
import { FetchEmptyView } from "./components";

export default function MostPlayedCommand() {
  const { data, isLoading, error } = useCachedPromise(
    async () => {
      return await getMostPlayed(40);
    },
    [],
    {
      onError: (err) => {
        showFailureToast(err, { title: "Failed to load most played albums" });
      },
    },
  );

  return (
    <Grid
      isLoading={isLoading}
      columns={5}
      searchBarPlaceholder="Filter most played albums..."
    >
      {!data || data.length === 0 ? (
        <FetchEmptyView
          error={error}
          isLoading={isLoading}
          errorTitle="Could Not Load Albums"
          emptyIcon={Icon.Music}
          emptyTitle="No Albums Found"
          emptyDescription="Play some music first!"
        />
      ) : (
        data.map((album) => <AlbumGridItem key={album.id} album={album} />)
      )}
    </Grid>
  );
}

function AlbumGridItem({ album }: { album: Album }) {
  const url = getNavidromeWebUrl("album", album.id);

  return (
    <Grid.Item
      content={
        album.coverArt
          ? { source: getCoverArtUrl(album.coverArt, 300) }
          : Icon.Music
      }
      title={album.name}
      subtitle={album.artist || ""}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Navidrome" url={url} />
          <Action.CopyToClipboard
            title="Copy Album Name"
            content={album.name}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy URL"
            content={url}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
