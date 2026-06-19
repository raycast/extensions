import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { trelloClient } from "./utils/trelloClient";
import { TrelloCard } from "./trelloResponse.model";
import { List as TrelloList } from "./List";
import { Board } from "./Board";

type ListWithBoard = TrelloList & { boardId: string; boardName: string };
type FormValues = { cardId: string };

export default function DeleteCard() {
  const [lists, setLists] = useState<ListWithBoard[]>([]);
  const [cards, setCards] = useState<TrelloCard[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [loadingLists, setLoadingLists] = useState<boolean>(false);
  const [loadingCards, setLoadingCards] = useState<boolean>(false);

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      setLoadingLists(true);
      const boards = await trelloClient.getBoards(false);
      const listsPerBoard = await Promise.all(
        boards.map(async (board: Board) => {
          const boardLists = await trelloClient.getLists(board.id);
          return boardLists.map((list) => ({ ...list, boardId: board.id, boardName: board.name }));
        }),
      );
      const flat = listsPerBoard.flat();
      setLists(flat);
      if (flat[0]?.id) {
        setSelectedListId(flat[0].id);
        await loadCardsForList(flat[0].id);
      }
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to load lists");
    } finally {
      setLoadingLists(false);
    }
  };

  const loadCardsForList = async (listId: string) => {
    try {
      setLoadingCards(true);
      const response = await trelloClient.getCardsForList(listId);
      setCards(response);
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to load cards");
    } finally {
      setLoadingCards(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    const card = cards.find((c) => c.id === values.cardId);
    const confirmed = await confirmAlert({
      title: "Delete card?",
      message: card ? card.name : "Are you sure?",
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await trelloClient.deleteCard(values.cardId);
      showToast(Toast.Style.Success, "Card deleted");
      setCards((prev) => prev.filter((c) => c.id !== values.cardId));
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to delete card");
    }
  };

  const selectedList = useMemo(() => lists.find((list) => list.id === selectedListId), [lists, selectedListId]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Delete Card" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Select a list, then choose a card (searchable) to delete." />
      <Form.Dropdown
        id="list"
        title="Card List"
        value={selectedListId}
        onChange={(val) => {
          setSelectedListId(val);
          loadCardsForList(val);
        }}
        isLoading={loadingLists}
      >
        {lists.map((list) => (
          <Form.Dropdown.Item key={list.id} value={list.id} title={list.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="cardId" title="Select Card" isLoading={loadingCards}>
        {cards.map((card) => (
          <Form.Dropdown.Item key={card.id} value={card.id} title={card.name} icon={Icon.Trash} />
        ))}
      </Form.Dropdown>
      {selectedList ? <Form.Description text={`Board: ${selectedList.boardName}`} /> : null}
    </Form>
  );
}
