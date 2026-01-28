import { Grid, List } from "@raycast/api";
import { useMemo } from "react";
import { PhotosListItem } from "./components/photos-list-item";
import { Photo } from "pexels";
import { PexelsEmptyView } from "./components/pexels-empty-view";
import { layout, mediaColumns } from "./types/preferences";
import { PhotosGridItem } from "./components/photos-grid-item";
import { useCollectionMedias } from "./hooks/useCollectionsMedias";

export default function ViewCollectionMedias(props: { id: string; title: string }) {
  const { id, title } = props;
  const { data: collectionMediasData, isLoading, pagination } = useCollectionMedias(id);

  const collectionMedias = useMemo(() => {
    return collectionMediasData || [];
  }, [collectionMediasData]);

  return layout === "List" ? (
    <List
      isShowingDetail={collectionMedias.length !== 0}
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle={title}
      searchBarPlaceholder={"Search photographers"}
    >
      <PexelsEmptyView title={"No Medias"} />
      {collectionMedias.map((pexelsPhoto, index) => {
        return <PhotosListItem key={index} item={pexelsPhoto as Photo} index={index} />;
      })}
    </List>
  ) : (
    <Grid
      columns={parseInt(mediaColumns)}
      isLoading={isLoading}
      pagination={pagination}
      aspectRatio={"3/2"}
      fit={Grid.Fit.Fill}
      navigationTitle={title}
      searchBarPlaceholder={"Search photographers"}
    >
      <PexelsEmptyView title={"No Medias"} />
      {collectionMedias.map((pexelsPhoto, index) => {
        return <PhotosGridItem key={index} item={pexelsPhoto as Photo} index={index} />;
      })}
    </Grid>
  );
}
