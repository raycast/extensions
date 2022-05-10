import { List } from "@raycast/api";
import { useState } from "react";
import { returnTodos } from "./utils/fetchTodos";
import { TrelloFetchResponse } from "./trelloResponse.model";
import { TodoListItem } from "./TrelloListItem";

export default function PackageList() {
  const [results, setTodos] = useState<TrelloFetchResponse>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const onSearchTextChange = async (text: string) => {
    setLoading(true);
    await returnTodos(text.replace(/\s/g, "+")).then((response) => {
      setTodos(response);
      setLoading(false);
    });
  };

  return (
    <List isLoading={loading} searchBarPlaceholder={`Search todos`} onSearchTextChange={onSearchTextChange} throttle>
      {results?.length
        ? results.map((result) => {
            return <TodoListItem key={result.id} result={result} />;
          })
        : null}
    </List>
  );
}
