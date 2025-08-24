import { Grid } from "@raycast/api";
import { Photo } from "pexels";
import { PexelsEmptyView } from "./pexels-empty-view";
import { PhotosGridItem } from "./photos-grid-item";
import { columns } from "../types/preferences";

export function CuratedPhotosGrid(props: {
  photos: Photo[];
  isLoading: boolean;
  pagination: { pageSize: number; hasMore: boolean; onLoadMore: () => void } | undefined;
}) {
  const { photos, isLoading, pagination } = props;

  return (
    <Grid
      isLoading={isLoading}
      pagination={pagination}
      columns={parseInt(columns)}
      aspectRatio={"2/3"}
      fit={Grid.Fit.Fill}
      searchBarPlaceholder={"Search photographers"}
    >
      <PexelsEmptyView title={"No Photos"} />
      {photos.map((value, index) => (
        <PhotosGridItem key={index} item={value} index={index} />
      ))}
    </Grid>
  );
}
