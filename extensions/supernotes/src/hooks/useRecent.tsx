import React from "react";

import { LocalStorage } from "@raycast/api";

import { ICard } from "../util/types";

interface Recent {
  card: ICard;
  timestamp: number;
}

export const useStoreCard = (card: ICard) => {
  React.useEffect(() => {
    const recent: Recent = { card, timestamp: Date.now() };
    // store under the card's UUID so that we don't end up with duplicates in the list
    LocalStorage.setItem(card.data.id, JSON.stringify(recent));
  }, []);
};

export const useRecentCards = () => {
  const [loading, setLoading] = React.useState(true);
  const [cards, setCards] = React.useState<Array<ICard>>();

  React.useEffect(() => {
    setLoading(true);
    LocalStorage.allItems<Record<string, string>>().then((storedCards) => {
      // sort based on the timestamp
      const sortedCards = Object.values(storedCards)
        .map((recent) => JSON.parse(recent) as Recent)
        .sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))
        .map((recent) => recent.card);
      setCards(sortedCards);
      setLoading(false);
    });
  }, []);

  return { loading, cards };
};
