import { Action, ActionPanel, List, Icon } from "@raycast/api";
import { useState } from "react";
import { trelloClient } from "./utils/trelloClient";
import { TrelloCard } from "./trelloResponse.model";
import { CardDetail } from "./components/CardDetail";

export default function CardDetailsSearch() {
  const [cards, setCards] = useState<TrelloCard[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const onSearchTextChange = async (text: string) => {
    setLoading(true);
    const response = await trelloClient.searchCards(text);
    setCards(response);
    setLoading(false);
  };

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search cards to view details"
      onSearchTextChange={onSearchTextChange}
      throttle
    >
      {cards.map((card) => {
        const accessories: List.Item.Accessory[] = [];
        if (card.due) accessories.push({ date: new Date(card.due) });
        if (card.labels?.length) accessories.push({ tag: card.labels.map((l) => l.name).join(", ") });

        return (
          <List.Item
            key={card.id}
            title={card.name}
            subtitle={card.desc}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.Push title="View Details" icon={Icon.Eye} target={<CardDetail cardId={card.id} />} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
