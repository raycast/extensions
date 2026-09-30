import { Icon, List } from "@raycast/api";
import { DownloadingEmptyView } from "./DownloadingList";
import { useState } from "react";
import { useMyGames, useRandomGames, useResultsWithDetails } from "../lib/fetcher";
import { useShowingDetail } from "../lib/hooks";
import { appidFromItemId } from "../lib/util";
import { DynamicGameListItem } from "./ListItems";

export const RandomGamesList = () => {
  const { data: picked, isLoading: picking, listStatus } = useRandomGames();
  const { games, loading: detailsLoading } = useResultsWithDetails(picked);
  const isLoading = picking || detailsLoading;
  const [hovered, setHovered] = useState(0);
  const { data: myGames } = useMyGames();
  const { showingDetail, toggleDetail } = useShowingDetail();

  return (
    <List
      navigationTitle="Random Games"
      filtering={false}
      isShowingDetail={showingDetail}
      isLoading={isLoading}
      searchBarPlaceholder=""
      onSelectionChange={(id) => setHovered(appidFromItemId(id))}
    >
      {listStatus ? (
        <DownloadingEmptyView status={listStatus} />
      ) : (
        <List.EmptyView icon={Icon.Shuffle} title={isLoading ? "Picking Games…" : "No Games Found"} />
      )}
      {games?.map((game) => (
        <DynamicGameListItem
          context="random"
          key={game.appid}
          game={game}
          ready={hovered === game.appid}
          myGames={myGames}
          showingDetail={showingDetail}
          onToggleDetail={toggleDetail}
        />
      ))}
    </List>
  );
};
