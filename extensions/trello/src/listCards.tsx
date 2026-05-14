import { List, Icon, Action, ActionPanel, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { trelloClient } from "./utils/trelloClient";
import { Board } from "./Board";
import { List as TrelloList } from "./List";
import { TrelloCard } from "./trelloResponse.model";
import { CardListItem } from "./TrelloListItem";

export default function CardsForList() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [lists, setLists] = useState<TrelloList[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    trelloClient
      .getBoards(false)
      .then((response) => {
        setBoards(response);
        if (response[0]?.id) setSelectedBoard(response[0].id);
      })
      .catch((err) => {
        console.error("Failed to load boards:", err);
        showToast(Toast.Style.Failure, "Failed to load boards");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedBoard) return;
    setLoading(true);
    trelloClient
      .getLists(selectedBoard)
      .then((response) => setLists(response))
      .catch((err) => {
        console.error("Failed to load lists:", err);
        showToast(Toast.Style.Failure, "Failed to load lists");
      })
      .finally(() => setLoading(false));
  }, [selectedBoard]);

  const selectedBoardName = useMemo(
    () => boards.find((b) => b.id === selectedBoard)?.name ?? "",
    [boards, selectedBoard],
  );

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Pick a board to view its lists"
      searchBarAccessory={
        <List.Dropdown tooltip="Board" value={selectedBoard} onChange={setSelectedBoard}>
          {boards.map((board) => (
            <List.Dropdown.Item key={board.id} value={board.id} title={board.name} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title={selectedBoardName || "Lists"}>
        {lists.map((list) => (
          <List.Item
            key={list.id}
            icon={Icon.List}
            title={list.name}
            actions={
              <ActionPanel>
                <Action.Push title="View Cards" icon={Icon.Eye} target={<CardsList list={list} />} />
                <Action.OpenInBrowser
                  title="Open Board"
                  url={boards.find((b) => b.id === selectedBoard)?.shortUrl ?? ""}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function CardsList({ list }: { list: TrelloList }) {
  const [cards, setCards] = useState<TrelloCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trelloClient
      .getCardsForList(list.id)
      .then((response) => setCards(response))
      .catch((err) => {
        console.error("Failed to load cards:", err);
        showToast(Toast.Style.Failure, "Failed to load cards");
      })
      .finally(() => setLoading(false));
  }, [list.id]);

  return (
    <List isLoading={loading} searchBarPlaceholder={`Cards in ${list.name}`}>
      {cards.length === 0 ? <List.EmptyView icon={Icon.Info} title="No cards found" /> : null}
      {cards.map((card) => (
        <CardListItem key={card.id} card={card} />
      ))}
    </List>
  );
}
