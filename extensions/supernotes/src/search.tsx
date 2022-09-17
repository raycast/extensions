import React from "react";

import { List } from "@raycast/api";

import { useRecentCards } from "hooks/useRecent";
import useSearch from "hooks/useSearch";
import { ICardCollection } from "utils/types";

import CardListItem from "components/CardListItem";

const CardSearch = () => {
  const [resultCards, setResultCards] = React.useState<ICardCollection>();
  const { search, loading: searchLoading } = useSearch((results) => setResultCards(results));

  const { cards: recentCards, loading: recentsLoading, refresh: refreshRecents } = useRecentCards();
  const removeFromResults = (cardId: string) => {
    refreshRecents();
    setResultCards((prevCards) => {
      if (!prevCards) return;
      const { [cardId]: _, ...keepCards } = prevCards;
      return keepCards;
    });
  };

  return (
    <List
      throttle
      isLoading={searchLoading || recentsLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search for cards..."
    >
      {resultCards
        ? Object.values(resultCards).map((card) => (
            <CardListItem key={card.data.id} card={card} removeFromList={removeFromResults} />
          ))
        : recentCards && (
            <List.Section title="Recently Viewed">
              {recentCards.map((card) => (
                <CardListItem key={card.data.id} card={card} removeFromList={removeFromResults} />
              ))}
            </List.Section>
          )}
    </List>
  );
};

export default CardSearch;
