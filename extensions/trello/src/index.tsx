import { List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { trelloClient } from "./utils/trelloClient";
import { TrelloFetchResponse } from "./trelloResponse.model";
import { TodoListItem } from "./TrelloListItem";

export default function PackageList() {
  const [results, setTodos] = useState<TrelloFetchResponse>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchAllTodos() {
      try {
        setLoading(true);
        const response = await trelloClient.getMyCards();
        setTodos(response);
        setLoading(false);
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
            return <TodoListItem key={result.id} card={result} />;
          })
        : null}
    </List>
  );
}
