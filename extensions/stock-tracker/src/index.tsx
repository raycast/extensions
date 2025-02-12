import { List } from "@raycast/api";
import { useState } from "react";
import SearchList from "./search-list";
import FavoritesList from "./favorites-list";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [searchIsLoading, setSearchIsLoading] = useState(false);
  const [favoritesIsLoading, setFavoritesIsLoading] = useState(true);
  const isLoading = searchText.length > 0 ? searchIsLoading : favoritesIsLoading;

  return (
    <List
      onSearchTextChange={setSearchText}
      searchText={searchText}
      throttle={true}
      isShowingDetail
      isLoading={isLoading}
    >
      {searchText.length > 0 ? (
        <SearchList searchText={searchText} handleLoading={setSearchIsLoading} />
      ) : (
        <FavoritesList handleLoading={setFavoritesIsLoading} />
      )}
    </List>
  );
}
