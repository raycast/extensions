import { useEffect, useState, useCallback } from "react";
import { ActionPanel, Icon, List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Card } from "./types";
import ViewCardAction from "./view-card";
import DeleteCardAction from "./delete-card";
import EditCardAction from "./edit-card";
import fs from "fs";

export default function ViewAllCards() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const [cards, setCards] = useState<Card[]>([]);
  const [error, setError] = useState<Error | unknown>();

  useEffect(() => {
    fs.readFile(preferences.dataFile, "utf-8", (error, data) => {
      if (error) {
        setError(error);
      }

      try {
        const cards: Card[] = JSON.parse(data);
        setCards(() => cards);
      } catch (error) {
        setError(error);
      }
    });
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

  const handleEdit = useCallback(
    (card: Card, index: number) => {
      const updatedCards = cards;
      updatedCards.splice(index, 1);
      updatedCards.push(card);
      setCards(() => updatedCards);

      fs.writeFile(preferences.dataFile, JSON.stringify(updatedCards, null, 4), (error) => {
        if (error) {
          setError(error);
        }
      });
    },
    [cards, setCards],
  );

  const handleDelete = useCallback(
    (index: number) => {
      const newCards = cards;
      newCards.splice(index, 1);
      setCards(() => newCards);

      fs.writeFile(preferences.dataFile, JSON.stringify(newCards, null, 4), (error) => {
        if (error) {
          setError(error);
        }
      });
    },
    [cards, setCards],
  );

  return (
    <List
      isLoading={cards.length === 0}
    >
      {cards.map((card, index) => (
        <List.Item
          key={index}
          title={card.question}
          icon={Icon.AppWindowList}
          accessories={[{ text: card.answer }, { tag: { value: card.tag }, icon: Icon.Tag }]}
          actions={
            <ActionPanel>
              <ViewCardAction card={card} />
              <EditCardAction card={card} onEdit={(updatedCard) => handleEdit(updatedCard, index)} />
              <DeleteCardAction onDelete={() => handleDelete(index)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
