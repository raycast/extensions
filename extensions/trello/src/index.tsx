import { List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { returnTodos } from "./utils/fetchTodos";
import { TrelloFetchResponse } from "./trelloResponse.model";
import { TodoListItem } from "./TrelloListItem";

export default function PackageList() {
  const [results, setTodos] = useState<TrelloFetchResponse>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchAllTodos() {
      try {
        setLoading(true);
        await returnTodos("").then((response) => {
          setTodos(response);
          setLoading(false);
        });
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed loading todos");
      }
    }

    fetchAllTodos();
  }, []);

  return (
    <List isLoading={loading} searchBarPlaceholder={`Filter todos`} throttle>
      {results?.length
        ? results.map((result) => {
            return <TodoListItem key={result.id} result={result} />;
          })
        : null}
    </List>
  );
}
