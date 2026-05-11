import { List } from "@raycast/api";
import { PexelsEmptyView } from "./pexels-empty-view";
import { PhotosListItem } from "./photos-list-item";
import { Photo } from "pexels/dist/types";

export function CuratedPhotosList(props: {
  photos: Photo[];
  isLoading: boolean;
  pagination: { pageSize: number; hasMore: boolean; onLoadMore: () => void } | undefined;
}) {
  const { photos, isLoading, pagination } = props;

  return (
    <List
      isShowingDetail={photos.length !== 0}
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder={"Search photographers"}
    >
      <PexelsEmptyView title={"No Photos"} />
      {photos.map((value, index) => (
        <PhotosListItem key={index} item={value} index={index} />
      ))}
    </List>
  );
}
