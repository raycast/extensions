import { useEffect, useState, useCallback } from "react";
import { ActionPanel, Icon, List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Card, Preferences } from "./types";
import ViewCardAction from "./view-card";
import DeleteCardAction from "./delete-card";
import EditCardAction from "./edit-card";
import fs from "fs";

type State = {
  cards: Card[];
  isLoading: boolean;
  searchText: string;
};

export default function ViewAllCards() {
  const preferences = getPreferenceValues<Preferences>();
  const [state, setState] = useState<State>({
    cards: [],
    isLoading: false,
    searchText: "",
  });
  const [error, setError] = useState<Error>();

  useEffect(() => {
    fs.readFile(preferences.dataFile, "utf-8", (error, data) => {
      if (error) {
        setError(error);
      }

      const cards: Card[] = JSON.parse(data);
      setState((previous) => ({ ...previous, cards: cards }));
    });
  }, []);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  const handleEdit = useCallback(
    (card: Card, index: number) => {
      const updatedCards = [...state.cards];
      updatedCards.splice(index, 1);
      updatedCards.push(card);
      setState((previous) => ({ ...previous, cards: updatedCards }));

      fs.writeFile(preferences.dataFile, JSON.stringify(updatedCards, null, 4), (error) => {
        if (error) {
          setError(error);
        }
        console.log("Updated file successfully");
      });
    },
    [state.cards, setState]
  );

  const handleDelete = useCallback(
    (index: number) => {
      const newCards = [...state.cards];
      newCards.splice(index, 1);
      setState((previous) => ({ ...previous, cards: newCards }));

      fs.writeFile(preferences.dataFile, JSON.stringify(newCards, null, 4), (error) => {
        if (error) {
          setError(error);
        }
        console.log("Updated file successfully");
      });
    },
    [state.cards, setState]
  );

  return (
    <List
      isLoading={state.isLoading}
      searchText={state.searchText}
      filtering={true}
      onSearchTextChange={(newValue) => {
        setState((previous) => ({ ...previous, searchText: newValue }));
      }}
    >
      {state.cards.map((card, index) => (
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
