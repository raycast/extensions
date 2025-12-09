import { List } from "@raycast/api";
import { useState } from "react";
import { trelloClient } from "./utils/trelloClient";
import { TrelloFetchResponse } from "./trelloResponse.model";
import { TodoListItem } from "./TrelloListItem";

export default function PackageList() {
  const [results, setTodos] = useState<TrelloFetchResponse>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const onSearchTextChange = async (text: string) => {
    setLoading(true);
    const response = await trelloClient.searchCards(text);
    setTodos(response);
    setLoading(false);
  };

  return (
    <List isLoading={loading} searchBarPlaceholder={`Search todos`} onSearchTextChange={onSearchTextChange} throttle>
      {results?.length
        ? results.map((result) => {
            return <TodoListItem key={result.id} card={result} />;
          })
        : null}
    </List>
  );
}
