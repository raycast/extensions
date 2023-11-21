import { useEffect, useState } from "react";
import { ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { Card } from "./types";
import ViewCardAction from "./view-card";
import DeleteCardAction from "./delete-card";
import EditCardAction from "./edit-card";
import { getCards, saveCards } from "./storage";

export default function ViewAllCards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [error, setError] = useState<Error | unknown>();

  useEffect(() => {
    try {
      (async () => {
        setCards(await getCards());
      })();
    } catch (e) {
      setError(e);
    }
  }, []);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [error]);

  async function handleEdit(editedCard: Card, index: number) {
    try {
      const cards: Card[] = await getCards();
      cards.splice(index, 1, editedCard);

      await saveCards(cards);
      setCards(await getCards());
    } catch (e) {
      setError(e);
    }
    
  };

  async function handleDelete(index: number) {
    try {
      const cards: Card[] = await getCards();
      cards.splice(index, 1);

      await saveCards(cards);
      setCards(await getCards());
    } catch (e) {
      setError(e);
    }
  };

  return (
    <List isLoading={cards.length === 0}>
      {cards.map((card, index) => (
        <List.Item
          key={index}
          title={card.question}
          subtitle={card.answer}
          icon={Icon.AppWindowList}
          keywords={[card.tag]}
          accessories={[{ tag: { value: card.tag }, icon: Icon.Tag }]}
          actions={
            <ActionPanel>
              <ViewCardAction card={card} onEdit={(updatedCard) => handleEdit(updatedCard, index)} onDelete={() => handleDelete(index)} />
              <EditCardAction card={card} onEdit={(updatedCard) => handleEdit(updatedCard, index)} />
              <DeleteCardAction onDelete={() => handleDelete(index)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
