import { List } from "@raycast/api";
import { useState } from "react";
import { trelloClient } from "./utils/trelloClient";
import { TrelloFetchResponse } from "./trelloResponse.model";
import { CardListItem } from "./TrelloListItem";

export default function PackageList() {
  const [results, setCards] = useState<TrelloFetchResponse>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const onSearchTextChange = async (text: string) => {
    setLoading(true);
    const response = await trelloClient.searchCards(text);
    setCards(response);
    setLoading(false);
  };

  return (
    <List isLoading={loading} searchBarPlaceholder={`Search cards`} onSearchTextChange={onSearchTextChange} throttle>
      {results?.length
        ? results.map((result) => {
            return <CardListItem key={result.id} card={result} />;
          })
        : null}
    </List>
  );
}
