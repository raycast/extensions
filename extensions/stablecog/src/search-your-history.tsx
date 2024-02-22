import { Grid, Icon } from "@raycast/api";
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
import { THistoryFilter } from "@ts/types";

export default function Command() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<THistoryFilter>("all");
  const { token, isTokenLoading } = useToken();
  const { historyPage, isLoadingHistoryPage, historyPageError } = useHistory({ search, token, filter });

  const searchBarAccessory = <SearchBarAccessory setFilter={setFilter} />;

  if (isTokenLoading) return <LoadingToken />;
  if (historyPageError) return <GridError error={historyPageError.message} searchBarAccessory={searchBarAccessory} />;
  if (historyPage === undefined) return <GridSearchingPlaceholder searchBarAccessory={searchBarAccessory} />;
  if (historyPage.hits.length === 0) return <GridNoItemsPlaceholder searchBarAccessory={searchBarAccessory} />;

  return (
    <Grid
      searchBarPlaceholder="Search your history..."
      onSearchTextChange={setSearch}
      isLoading={isLoadingHistoryPage}
      columns={defaultGridColumns}
      throttle={true}
      searchBarAccessory={searchBarAccessory}
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

function SearchBarAccessory({ setFilter }: { setFilter: (filter: THistoryFilter) => void }) {
  return (
    <Grid.Dropdown onChange={(newValue) => setFilter(newValue === "favorites" ? "favorites" : "all")} tooltip="Filters">
      <Grid.Dropdown.Item title="All" value="all" icon={Icon.AppWindowGrid3x3} />
      <Grid.Dropdown.Item title="Favorites" value="favorites" icon={Icon.Star} />
    </Grid.Dropdown>
  );
}
