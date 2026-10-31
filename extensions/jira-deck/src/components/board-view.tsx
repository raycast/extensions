import { Action, ActionPanel, Icon, Keyboard, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import { boardIcon } from "../lib/icons";
import { IssuePage, IssueScope } from "../lib/issue";
import { usePinnedBoards } from "../lib/pins";
import { BoardPicker } from "./board-picker";
import { CreateIssueDefaults } from "./create-issue-form";
import { IssueList } from "./issue-list";

interface Props {
  /** Keeps each command's filters separate. */
  id: string;
  load: (boardId: string) => Promise<IssuePage>;
  /** From Manage Boards. Shown even when it isn't pinned. */
  boardId?: string;
  createDefaults?: CreateIssueDefaults;
}

/**
 * One board at a time: the one it was opened with, else the default pinned board.
 * With nothing pinned, the user picks boards first instead of getting one they don't work on.
 */
export function BoardView({ id, load, boardId: launchedWith, createDefaults }: Props) {
  const pins = usePinnedBoards();
  const { pop } = useNavigation();
  const [chosen, setChosen] = useState(launchedWith);
  // Stays in the picker after the first pin, so several can be pinned before opening one.
  const [startedEmpty, setStartedEmpty] = useState<boolean>();
  if (pins.ready && startedEmpty === undefined) setStartedEmpty(pins.boards.length === 0);

  if (!chosen && !pins.ready) return <List isLoading />;
  const boardId = chosen ?? pins.boards[0]?.id;
  if (!boardId || (!chosen && (startedEmpty ?? pins.boards.length === 0))) {
    return <BoardPicker firstRun onOpen={(board) => setChosen(board.id)} />;
  }

  function boardActions(scope?: IssueScope) {
    const current = scope?.board;
    return (
      <>
        {pins.boards.length > 1 && (
          <ActionPanel.Submenu
            title="Switch Board"
            icon={Icon.AppWindowGrid3x3}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
          >
            {pins.boards.map((board, index) => (
              <Action
                key={board.id}
                title={board.name}
                icon={board.id === boardId ? Icon.CheckCircle : boardIcon(board)}
                shortcut={
                  index < 9 ? { modifiers: ["cmd"], key: String(index + 1) as Keyboard.KeyEquivalent } : undefined
                }
                onAction={() => setChosen(board.id)}
              />
            ))}
          </ActionPanel.Submenu>
        )}
        <Action.Push
          title="Manage Boards"
          icon={Icon.Tack}
          shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
          target={
            <BoardPicker
              onOpen={(board) => {
                setChosen(board.id);
                pop();
              }}
            />
          }
        />
        {current && !pins.isPinned(current) && (
          <Action
            title="Pin Board"
            icon={Icon.Tack}
            shortcut={Keyboard.Shortcut.Common.Pin}
            onAction={() => pins.pin(current)}
          />
        )}
      </>
    );
  }

  return (
    <IssueList
      id={id}
      loadKey={boardId}
      load={() => load(boardId)}
      boardActions={boardActions}
      createDefaults={createDefaults}
    />
  );
}
