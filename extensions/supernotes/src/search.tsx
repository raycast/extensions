import React from "react";

import { List } from "@raycast/api";

import CardListItem from "./components/CardListItem";
import useSearch from "./hooks/useSearch";
import { ICardCollection } from "./util/types";
import { useRecentCards } from "./hooks/useRecent";

const CardSearch = () => {
  const [resultCards, setResultCards] = React.useState<ICardCollection>();
  const { search, loading: searchLoading } = useSearch((results) => setResultCards(results));

  const { cards: recentCards, loading: recentsLoading, refresh } = useRecentCards();

  return (
    <List
      throttle
      isLoading={searchLoading || recentsLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search for cards..."
    >
      {resultCards
        ? Object.values(resultCards).map((card) => <CardListItem key={card.data.id} card={card} />)
        : recentCards && (
            <List.Section title="Recently Viewed">
              {recentCards.map((card) => (
                <CardListItem key={card.data.id} card={card} refreshList={refresh} />
              ))}
            </List.Section>
          )}
    </List>
  );
};

export default CardSearch;
