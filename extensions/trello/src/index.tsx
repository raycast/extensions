import { List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { trelloClient } from "./utils/trelloClient";
import { TrelloFetchResponse } from "./trelloResponse.model";
import { CardListItem } from "./TrelloListItem";

export default function PackageList() {
  const [results, setCards] = useState<TrelloFetchResponse>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchAllCards() {
      try {
        setLoading(true);
        const response = await trelloClient.getMyCards();
        setCards(response);
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed loading cards");
      } finally {
        setLoading(false);
      }
    }

    fetchAllCards();
  }, []);

  return (
    <List isLoading={loading} searchBarPlaceholder={`Filter cards`} throttle>
      {results?.length
        ? results.map((result) => {
            return <CardListItem key={result.id} card={result} />;
          })
        : null}
    </List>
  );
}
