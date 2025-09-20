import { Grid, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { PhotosListItem } from "./components/photos-list-item";
import { PexelsEmptyView } from "./components/pexels-empty-view";
import { isEmpty } from "./utils/common-utils";
import { PhotosGridItem } from "./components/photos-grid-item";
import { usePhotos } from "./hooks/usePhotos";
import { columns, layout } from "./types/preferences";

export default function SearchPhotos() {
  const [searchContent, setSearchContent] = useState<string>("");
  const { data: photosData, isLoading, pagination } = usePhotos(searchContent);

  const photos = useMemo(() => {
    return photosData || [];
  }, [photosData]);

  const emptyViewTitle = () => {
    if (isLoading) {
      return "Loading...";
    }
    if (photos.length === 0 && !isEmpty(searchContent)) {
      return "No Photos";
    }
    return "Welcome to Pexels";
  };

  return layout === "List" ? (
    <List
      isShowingDetail={photos.length !== 0}
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder={"Search photos"}
      onSearchTextChange={setSearchContent}
      throttle={true}
    >
      <PexelsEmptyView title={emptyViewTitle()} />
      {photos.map((value, index) => (
        <PhotosListItem key={index} item={value} index={index} />
      ))}
    </List>
  ) : (
    <Grid
      columns={parseInt(columns)}
      isLoading={isLoading}
      aspectRatio={"3/2"}
      fit={Grid.Fit.Fill}
      pagination={pagination}
      searchBarPlaceholder={"Search photos"}
      onSearchTextChange={(newValue) => {
        setSearchContent(newValue);
      }}
      throttle={true}
    >
      <PexelsEmptyView title={emptyViewTitle()} />
      {photos.map((value, index) => (
        <PhotosGridItem key={index} item={value} index={index} />
      ))}
    </Grid>
  );
}
