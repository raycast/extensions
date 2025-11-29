import { useState } from "react";
import { Icon, List } from "@raycast/api";
import { useGameSearch } from "./hooks/use-game-search";
import { GameListItem } from "./components/GameListItem";

const Command = () => {
  const [search, setSearch] = useState("");
  const { data, error, isLoading, pagination } = useGameSearch(search);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Games..."
      onSearchTextChange={setSearch}
      throttle={true}
      filtering={false}
      pagination={pagination}
      isShowingDetail={data.length > 0}
    >
      {(!error && !isLoading && data.length === 0) || error ? (
        <List.EmptyView
          title={error ? "Error" : "No Results"}
          description={error ? error.message : "Try a different search term"}
          icon={{ source: Icon.GameController }}
        />
      ) : undefined}
      {!error && data.map((item) => <GameListItem key={item.id} item={item} />)}
    </List>
  );
};

export default Command;
