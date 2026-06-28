import {
  ActionPanel,
  Action,
  Grid,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  getRecentlyAdded,
  getCoverArtUrl,
  getNavidromeWebUrl,
  type Album,
} from "./api";

export default function RecentlyAddedCommand() {
  const { data, isLoading } = useCachedPromise(
    async () => {
      return await getRecentlyAdded(40);
    },
    [],
    {
      onError: (err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load recently added albums",
          message: err.message,
        });
      },
    },
  );

  return (
    <Grid
      isLoading={isLoading}
      columns={5}
      searchBarPlaceholder="Filter recently added albums..."
    >
      {!data || data.length === 0
        ? !isLoading && (
            <Grid.EmptyView
              icon={Icon.Music}
              title="No Albums Found"
              description="Your library appears to be empty"
            />
          )
        : data.map((album) => <AlbumGridItem key={album.id} album={album} />)}
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
