import { Grid } from "@raycast/api";
import { useState } from "react";
import useHistory from "@hooks/useHistory";
import GridSearchingPlaceholder from "@components/GridSearchingPlaceholder";
import GridNoItemsPlaceholder from "@components/GridNoItemsPlaceholder";
import { useToken } from "@hooks/useAuthorization";
import LoadingToken from "@components/LoadingToken";
import GalleryItemActions from "@components/GalleryItemActions";
import { defaultGridColumns } from "@ts/constants";
import { getThumbnailImgUrl } from "@ts/helpers";
import GridError from "@components/GridError";

export default function Command() {
  const [query, setQuery] = useState("");
  const { token, isTokenLoading } = useToken();
  const { historyPage, isLoadingHistoryPage, historyPageError } = useHistory({ search: query, token: token });

  if (isTokenLoading) return <LoadingToken />;
  if (historyPageError) return <GridError error={historyPageError.message} />;
  if (historyPage === undefined) return <GridSearchingPlaceholder />;
  if (historyPage.hits.length === 0) return <GridNoItemsPlaceholder />;

  return (
    <Grid
      searchBarPlaceholder="Search your history..."
      onSearchTextChange={setQuery}
      isLoading={isLoadingHistoryPage}
      columns={defaultGridColumns}
      throttle={true}
    >
      {historyPage.hits.map((hit) => (
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
