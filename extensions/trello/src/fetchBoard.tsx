import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { Board } from "./Board";
import { List as TrelloList } from "./List";
import { Member } from "./Member";
import { trelloClient } from "./utils/trelloClient";

export default function FetchBoard() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [lists, setLists] = useState<TrelloList[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trelloClient
      .getBoards(false)
      .then((response) => {
        setBoards(response);
        if (response[0]?.id) setSelectedBoardId(response[0].id);
      })
      .catch(() => showToast(Toast.Style.Failure, "Failed loading boards"));
  }, []);

  useEffect(() => {
    if (!selectedBoardId) return;
    loadBoardData(selectedBoardId);
  }, [selectedBoardId]);

  const loadBoardData = async (boardId: string) => {
    try {
      setLoading(true);
      const [boardLists, boardMembers] = await Promise.all([
        trelloClient.getLists(boardId),
        trelloClient.getBoardMembers(boardId),
      ]);
      setLists(boardLists);
      setMembers(boardMembers);
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to load board data");
    } finally {
      setLoading(false);
    }
  };

  const selectedBoard = useMemo(() => boards.find((b) => b.id === selectedBoardId), [boards, selectedBoardId]);
  const markdown = useMemo(() => buildMarkdown(selectedBoard, lists, members), [selectedBoard, lists, members]);

  return (
    <List
      isLoading={loading}
      isShowingDetail
      navigationTitle="Fetch Board"
      searchBarPlaceholder="Select a board"
      searchBarAccessory={
        <List.Dropdown tooltip="Board" value={selectedBoardId} onChange={(val) => setSelectedBoardId(val)} storeValue>
          {boards.map((board) => (
            <List.Dropdown.Item key={board.id} value={board.id} title={board.name} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Item
        title={selectedBoard?.name ?? "Select a board"}
        detail={
          <List.Item.Detail
            markdown={markdown}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Board" text={selectedBoard?.name ?? "Loading..."} />
                <List.Item.Detail.Metadata.Label title="Lists" text={lists.length.toString()} />
                <List.Item.Detail.Metadata.Label title="Members" text={members.length.toString()} />
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            {selectedBoard?.shortUrl ? (
              <Action.OpenInBrowser title="Open in Browser" icon={Icon.Globe} url={selectedBoard.shortUrl} />
            ) : null}
          </ActionPanel>
        }
      />
    </List>
  );
}

function buildMarkdown(board?: Board, lists?: TrelloList[], members?: Member[]) {
  if (!board) return "Loading board…";
  const lines: string[] = [];
  lines.push(`# ${board.name}`);
  if (board.desc) lines.push(board.desc);
  lines.push(`\n**Lists (${lists?.length ?? 0})**`);
  (lists ?? []).forEach((list) => lines.push(`- ${list.name}`));
  lines.push(`\n**Members (${members?.length ?? 0})**`);
  (members ?? []).forEach((m) => lines.push(`- ${m.fullName || m.username}`));
  if (board.shortUrl) lines.push(`\n[Open in Trello](${board.shortUrl})`);
  return lines.join("\n");
}
