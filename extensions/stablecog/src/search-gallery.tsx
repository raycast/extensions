import GalleryItemActions from "@components/GalleryItemActions";
import GridError from "@components/GridError";
import GridNoItemsPlaceholder from "@components/GridNoItemsPlaceholder";
import GridSearchingPlaceholder from "@components/GridSearchingPlaceholder";
import LoadingToken from "@components/LoadingToken";
import { useToken } from "@hooks/useAuthorization";
import useGallery from "@hooks/useGallery";
import { Grid } from "@raycast/api";
import { defaultGridColumns } from "@ts/constants";
import { getThumbnailImgUrl } from "@ts/helpers";
import { useState } from "react";

export default function Command() {
  const [query, setQuery] = useState("");
  const { token, isTokenLoading } = useToken();
  const { galleryPage, isLoadingGalleryPage, galleryPageError } = useGallery({ search: query, token: token });

  if (isTokenLoading) return <LoadingToken />;
  if (galleryPageError) return <GridError error={galleryPageError.message} />;
  if (galleryPage === undefined) return <GridSearchingPlaceholder />;
  if (galleryPage.hits.length === 0) return <GridNoItemsPlaceholder />;

  return (
    <Grid
      searchBarPlaceholder="Search gallery..."
      onSearchTextChange={setQuery}
      isLoading={isLoadingGalleryPage}
      columns={defaultGridColumns}
      throttle={true}
    >
      {galleryPage.hits.map((hit) => (
        <Grid.Item
          key={hit.id}
          actions={<GalleryItemActions item={hit} />}
          content={{
            source: getThumbnailImgUrl(hit.image_url, defaultGridColumns),
          }}
        ></Grid.Item>
      ))}
    </Grid>
  );
}
