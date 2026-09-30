import { Icon, List } from "@raycast/api";
import { MIN_QUERY_LENGTH, SearchEmptyView } from "./SearchEmptyView";
import { ListStatus } from "./DownloadingList";
import { useState } from "react";
import { useGamesSearch, useMyGames, useResultsWithDetails } from "../lib/fetcher";
import { useShowingDetail } from "../lib/hooks";
import { appidFromItemId, itemId } from "../lib/util";
import { DynamicGameListItem } from "./ListItems";
import { GameSimple } from "../types";

export const Search = () => {
  const [search, setSearch] = useState("");
  const [hovered, setHovered] = useState(0);
  const { showingDetail, toggleDetail } = useShowingDetail();
  const {
    data: foundGames,
    isLoading: searching,
    isError,
    listStatus,
  } = useGamesSearch({
    term: search,
    execute: search.trim().length >= MIN_QUERY_LENGTH,
  });
  const { games: searchedGames, loading: detailsLoading } = useResultsWithDetails(foundGames);
  const isLoading = searching || detailsLoading;
  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail && Boolean(searchedGames?.length)}
      selectedItemId={searchedGames?.[0] ? itemId("Search", searchedGames[0].appid, search) : undefined}
      onSearchTextChange={setSearch}
      onSelectionChange={(id) => setHovered(appidFromItemId(id))}
      throttle
      searchBarPlaceholder="Search games by title..."
    >
      <SearchList
        search={search}
        searchedGames={searchedGames}
        isLoading={isLoading}
        listStatus={listStatus}
        error={isError}
        hovered={hovered}
        showingDetail={showingDetail}
        onToggleDetail={toggleDetail}
      />
    </List>
  );
};

export const SearchList = ({
  search,
  searchedGames,
  isLoading,
  listStatus,
  error,
  hovered,
  showingDetail,
  onToggleDetail,
}: {
  search: string;
  searchedGames?: GameSimple[];
  isLoading: boolean;
  listStatus?: ListStatus;
  error?: Error;
  hovered: number;
  showingDetail: boolean;
  onToggleDetail: () => void;
}) => {
  const { data: myGames } = useMyGames();
  return (
    <>
      <SearchEmptyView
        noun="Games"
        icon={Icon.GameController}
        query={search}
        isLoading={isLoading}
        listStatus={listStatus}
        error={error}
      />
      <List.Section title="Search Results">
        {searchedGames?.map((game) => (
          <DynamicGameListItem
            context="Search"
            key={game.appid}
            game={game}
            ready={hovered === game.appid}
            myGames={myGames}
            showingDetail={showingDetail}
            onToggleDetail={onToggleDetail}
            search={search}
          />
        ))}
      </List.Section>
    </>
  );
};
