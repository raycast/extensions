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
  getMostPlayed,
  getCoverArtUrl,
  getNavidromeWebUrl,
  type Album,
} from "./api";

export default function MostPlayedCommand() {
  const { data, isLoading } = useCachedPromise(
    async () => {
      return await getMostPlayed(40);
    },
    [],
    {
      onError: (err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load most played albums",
          message: err.message,
        });
      },
    },
  );

  return (
    <Grid
      isLoading={isLoading}
      columns={5}
      searchBarPlaceholder="Filter most played albums..."
    >
      {!data || data.length === 0
        ? !isLoading && (
            <Grid.EmptyView
              icon={Icon.Music}
              title="No Albums Found"
              description="Play some music first!"
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
