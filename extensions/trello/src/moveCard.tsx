import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { trelloClient } from "./utils/trelloClient";
import { TrelloCard } from "./trelloResponse.model";
import { List as TrelloList } from "./List";
import { Board } from "./Board";

type ListWithBoard = TrelloList & { boardId: string; boardName: string };

type FormValues = {
  listId: string;
  cardId: string;
  targetListId: string;
};

export default function MoveCard() {
  const [lists, setLists] = useState<ListWithBoard[]>([]);
  const [cards, setCards] = useState<TrelloCard[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [loadingLists, setLoadingLists] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);

  useEffect(() => {
    loadAllLists();
  }, []);

  const loadAllLists = async () => {
    try {
      setLoadingLists(true);
      const boards = await trelloClient.getBoards(false);
      const listsPerBoard = await Promise.all(
        boards.map(async (board: Board) => {
          const boardLists = await trelloClient.getLists(board.id);
          return boardLists.map((list) => ({ ...list, boardId: board.id, boardName: board.name }));
        }),
      );
      const flatLists = listsPerBoard.flat();
      setLists(flatLists);
      if (flatLists[0]?.id) {
        setSelectedListId(flatLists[0].id);
        await loadCards(flatLists[0].id);
      }
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to load lists");
    } finally {
      setLoadingLists(false);
    }
  };

  const loadCards = async (listId: string) => {
    try {
      setLoadingCards(true);
      const response = await trelloClient.getCardsForList(listId);
      setCards(response);
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to load cards for list");
    } finally {
      setLoadingCards(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await trelloClient.moveCard(values.cardId, values.targetListId);
      showToast(Toast.Style.Success, "Card moved");
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to move card");
    }
  };

  const selectedList = useMemo(() => lists.find((list) => list.id === selectedListId), [lists, selectedListId]);

  const destinationLists = useMemo(
    () => lists.filter((list) => list.boardId === selectedList?.boardId),
    [lists, selectedList?.boardId],
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Move Card" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Pick the source list, select a card from that list, then choose destination list on the same board." />
      <Form.Dropdown
        id="listId"
        title="Card List"
        value={selectedListId}
        onChange={(val) => {
          setSelectedListId(val);
          loadCards(val);
        }}
        isLoading={loadingLists}
      >
        {lists.map((list) => (
          <Form.Dropdown.Item key={list.id} value={list.id} title={list.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="cardId" title="Card" isLoading={loadingCards}>
        {cards.map((card) => (
          <Form.Dropdown.Item
            key={card.id}
            value={card.id}
            title={card.name}
            icon={card.dueComplete ? Icon.CheckCircle : Icon.List}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="targetListId" title="Destination List" isLoading={loadingLists}>
        {destinationLists.map((list) => (
          <Form.Dropdown.Item key={list.id} value={list.id} title={list.name} />
        ))}
      </Form.Dropdown>
      {selectedList ? <Form.Description text={`Board: ${selectedList.boardName}`} /> : null}
    </Form>
  );
}
