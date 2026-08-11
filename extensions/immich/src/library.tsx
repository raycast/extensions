import { AlbumResponseDto, getAlbumInfo, getAllAlbums } from "@immich/sdk";
import { Action, ActionPanel, Grid, Icon, LaunchProps } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getAssetThumbnail, initialize } from "./immich";
import AssetView from "./views/asset-view";

export default function Library(props: LaunchProps<{ arguments: Arguments.Library }>) {
  switch (props.arguments.page) {
    case "albums":
      return <Albums />;
  }
}

function Albums() {
  const { isLoading, data: grouped } = useCachedPromise(
    async () => {
      initialize();
      const res = await getAllAlbums({});
      return res.reduce((acc: { [year: string]: AlbumResponseDto[] }, album) => {
        const year = album.endDate ? new Date(album.endDate).getFullYear().toString() : "unknown";

        if (!acc[year]) acc[year] = [];
        acc[year].push(album);
        acc[year].sort((a, b) => {
          const da = a.endDate ? new Date(a.endDate).getTime() : 0;
          const db = b.endDate ? new Date(b.endDate).getTime() : 0;
          return db - da;
        });

        return acc;
      }, {});
    },
    [],
    { initialData: [] },
  );

  return (
    <Grid isLoading={isLoading}>
      {Object.entries(grouped)
        .toReversed()
        .map(([year, albums]) => (
          <Grid.Section key={year} title={year}>
            {albums.map((album) => (
              <Grid.Item
                key={album.id}
                content={album.albumThumbnailAssetId ? getAssetThumbnail(album.albumThumbnailAssetId) : Icon.Image}
                title={album.albumName}
                actions={
                  <ActionPanel>
                    <Action.Push
                      icon={Icon.Image}
                      title="View Album Assets"
                      target={<AlbumAssetsView album={album} />}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </Grid.Section>
        ))}
    </Grid>
  );
}

function AlbumAssetsView({ album }: { album: AlbumResponseDto }) {
  const { isLoading, data: assets } = useCachedPromise(
    async (id: string) => {
      const res = await getAlbumInfo({ id });
      return res.assets;
    },
    [album.id],
    { initialData: [] },
  );

  return (
    <Grid isLoading={isLoading}>
      {assets.map((asset) => (
        <Grid.Item
          key={asset.id}
          content={getAssetThumbnail(asset.id)}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Info} title="View Asset" target={<AssetView asset={asset} />} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
