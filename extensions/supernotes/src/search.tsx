import React from "react";

import { List } from "@raycast/api";

import CardListItem from "./components/CardListItem";
import useSearch from "./hooks/useSearch";
import { ICardCollection } from "./util/types";

const CardSearch = () => {
  const [cards, setCards] = React.useState<ICardCollection>({});
  const { search, loading } = useSearch((results) => setCards(results));

  return (
    <List throttle isLoading={loading} onSearchTextChange={search} searchBarPlaceholder="Search for cards...">
      {Object.values(cards).map((card) => (
        <CardListItem key={card.data.id} card={card} />
      ))}
    </List>
  );
};

export default CardSearch;
