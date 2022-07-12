import { List } from "@raycast/api";

import CardListItem from "./components/CardListItem";
import { useRecentCards } from "./hooks/useRecent";

const RecentCards = () => {
  const { cards, loading, refresh } = useRecentCards();

  return (
    <List isLoading={loading} searchBarPlaceholder="Search for recent cards...">
      {cards && cards.map((card) => <CardListItem key={card.data.id} card={card} refreshList={refresh} />)}
    </List>
  );
};

export default RecentCards;
