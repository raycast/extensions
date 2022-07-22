import { Grid } from "@raycast/api";
import useGiphy, { SearchState } from "../hooks/useGiphy";
import Favorites from "./Favorites";
import History from "./History";
import GiphyResult from "./GiphyResult";

function GiphySearch() {
  const {
    state: { loading },
    search,
    searchState,
    setSearchState,
  } = useGiphy();

  return (
    <Grid
      itemSize={Grid.ItemSize.Medium}
      isLoading={loading}
      onSearchTextChange={search}
      navigationTitle={"Search GIFs"}
      searchBarPlaceholder="Search for GIFs ..."
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Item Type"
          storeValue
          onChange={(newValue) => {
            setSearchState(newValue as SearchState);
          }}
        >
          <Grid.Dropdown.Item title="Giphy" value={"giphy"} />
          <Grid.Dropdown.Item title="Favorites" value={"favs"} />
          <Grid.Dropdown.Item title="History" value={"history"} />
        </Grid.Dropdown>
      }
    >
      {searchState === "giphy" && <GiphyResult />}
      {searchState === "favs" && <Favorites />}
      {searchState === "history" && <History />}
    </Grid>
  );
}

export default GiphySearch;
