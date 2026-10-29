import { AlbumResponseDto, getAlbumInfo, getAllAlbums, searchAssets } from "@immich/sdk";
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
  const {
    isLoading,
    data: assets,
    pagination,
  } = useCachedPromise(
    (id: string) => async (options: { page: number }) => {
      if (options.page === 0) {
        const res = await getAlbumInfo({ id });
        // Older servers include the photos in the album response
        if (res.assets && res.assets.length > 0) return { data: res.assets, hasMore: false };
        if (res.assetCount === 0) return { data: [], hasMore: false };
      }
      // Newer Immich servers no longer include `assets` in the album response, so page through search instead
      const res = await searchAssets({ metadataSearchDto: { albumIds: [id], page: options.page + 1, size: 100 } });
      return { data: res.assets.items, hasMore: !!res.assets.nextPage };
    },
    [album.id],
    { initialData: [] },
  );

  return (
    <Grid isLoading={isLoading} pagination={pagination}>
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
