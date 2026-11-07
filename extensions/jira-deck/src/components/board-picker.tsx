import { Action, ActionPanel, Color, Icon, Keyboard, launchCommand, LaunchType, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { boardIcon, boardSubtitle } from "../lib/icons";
import { Board, SpaceActivity } from "../lib/issue";
import { PinnedBoards, usePinnedBoards } from "../lib/pins";
import { getBoards, getBoardUrl, getSpaceActivity, sourceKey } from "../lib/source";
import { ExtensionActions, RetryActions } from "./extension-actions";

interface Props {
  /** Board or Backlog opened with nothing pinned: ↵ pins the board and opens it. */
  firstRun?: boolean;
  /** Shows a board. Without it, ↵ launches the Board command. */
  onOpen?: (board: Board) => void;
}

const ALL_SPACES = "all";

function openBoardCommand(board: Board) {
  return launchCommand({ name: "board", type: LaunchType.UserInitiated, context: { boardId: board.id } });
}

/** Pick, order and unpin the boards Jira Deck shows. Boards from spaces the user works in come first. */
export function BoardPicker({ firstRun = false, onOpen = openBoardCommand }: Props) {
  const key = sourceKey();
  const pins = usePinnedBoards();
  const {
    data: boards,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    (cacheKey: string) => {
      void cacheKey;
      return getBoards();
    },
    [key],
    { onError: () => undefined },
  );
  const { data: activity, isLoading: loadingActivity } = useCachedPromise(
    (cacheKey: string) => {
      void cacheKey;
      return getSpaceActivity();
    },
    [key],
    // Suggestions are a bonus: without them every board is still listed.
    { onError: () => undefined },
  );
  const [space, setSpace] = useState(ALL_SPACES);

  // Pinned boards are saved with their names, so a renamed board catches up.
  useEffect(() => {
    if (boards && pins.ready) void pins.refresh(boards);
  }, [boards, pins.ready]);

  const spaces = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const board of boards ?? []) if (board.spaceKey) byKey.set(board.spaceKey, board.spaceName ?? board.spaceKey);
    return [...byKey].sort((a, b) => a[1].localeCompare(b[1]));
  }, [boards]);

  const inSpace = (board: Board) => space === ALL_SPACES || board.spaceKey === space;
  const activityBySpace = new Map((activity ?? []).map((entry) => [entry.spaceKey, entry]));
  const activityOf = (board: Board) => (board.spaceKey ? activityBySpace.get(board.spaceKey) : undefined);

  const pinned = pins.boards.filter(inSpace);
  const unpinned = (boards ?? []).filter((board) => inSpace(board) && !pins.isPinned(board));
  const suggested = unpinned
    .filter((board) => activityOf(board))
    .sort((a, b) => (activityOf(b)?.issues ?? 0) - (activityOf(a)?.issues ?? 0) || a.name.localeCompare(b.name));
  const others = unpinned.filter((board) => !activityOf(board));

  const title = firstRun ? "Pick Your Boards" : "Manage Boards";
  const actionsFor = (board: Board) => (
    <BoardActions board={board} pins={pins} firstRun={firstRun} onOpen={onOpen} onRefresh={revalidate} />
  );

  return (
    <List
      isLoading={isLoading || loadingActivity || !pins.ready}
      navigationTitle={pins.boards.length ? `${title} · ${pins.boards.length} pinned` : title}
      searchBarPlaceholder={firstRun ? "Pick the boards you want to see" : "Search boards by name or space"}
      searchBarAccessory={
        <List.Dropdown tooltip="Space" value={space} onChange={setSpace}>
          <List.Dropdown.Item title="All Spaces" value={ALL_SPACES} icon={Icon.AppWindowGrid3x3} />
          <List.Dropdown.Section title="Spaces">
            {spaces.map(([spaceKey, name]) => (
              <List.Dropdown.Item key={spaceKey} title={`${name} (${spaceKey})`} value={spaceKey} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error && !boards ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't Load Boards"
          description={error.message}
          actions={
            <ActionPanel>
              <RetryActions onRetry={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        !isLoading && (
          <List.EmptyView
            icon={Icon.AppWindowGrid3x3}
            title="No Boards"
            description="Your Jira account can't see any boards. My Issues and Create Issue still work without one."
          />
        )
      )}
      <List.Section title="Pinned" subtitle={firstRun ? undefined : "The first one opens by default"}>
        {pinned.map((board) => (
          <List.Item
            key={board.id}
            title={board.name}
            subtitle={boardSubtitle(board)}
            keywords={keywords(board)}
            icon={boardIcon(board)}
            accessories={[
              ...(pins.boards[0]?.id === board.id && !firstRun
                ? [{ tag: { value: "Default", color: Color.Blue } }]
                : []),
              { icon: { source: Icon.Tack, tintColor: Color.Orange }, tooltip: "Pinned" },
            ]}
            actions={actionsFor(board)}
          />
        ))}
      </List.Section>
      <List.Section title="Suggested" subtitle="Spaces you worked in lately">
        {suggested.map((board) => (
          <List.Item
            key={board.id}
            title={board.name}
            subtitle={boardSubtitle(board)}
            keywords={keywords(board)}
            icon={boardIcon(board)}
            accessories={[suggestionTag(activityOf(board))]}
            actions={actionsFor(board)}
          />
        ))}
      </List.Section>
      <List.Section title="All Boards" subtitle={others.length ? String(others.length) : undefined}>
        {others.map((board) => (
          <List.Item
            key={board.id}
            title={board.name}
            subtitle={boardSubtitle(board)}
            keywords={keywords(board)}
            icon={boardIcon(board)}
            actions={actionsFor(board)}
          />
        ))}
      </List.Section>
    </List>
  );
}

function keywords(board: Board): string[] {
  return [board.spaceKey, board.spaceName].filter((word): word is string => Boolean(word));
}

function suggestionTag(activity?: SpaceActivity): List.Item.Accessory {
  if (!activity?.issues) return { tag: "Viewed recently" };
  const count = `${activity.issues} ${activity.issues === 1 ? "issue" : "issues"}`;
  return { tag: { value: `${count} you're on`, color: Color.Orange }, tooltip: "Updated in the last 30 days" };
}

function BoardActions({
  board,
  pins,
  firstRun,
  onOpen,
  onRefresh,
}: {
  board: Board;
  pins: PinnedBoards;
  firstRun: boolean;
  onOpen: (board: Board) => void;
  onRefresh: () => void;
}) {
  const index = pins.boards.findIndex((entry) => entry.id === board.id);
  const pinned = index >= 0;
  const url = getBoardUrl(board);

  return (
    <ActionPanel title={board.name}>
      <ActionPanel.Section>
        {firstRun ? (
          <Action
            title="Pin and Open"
            icon={Icon.Tack}
            onAction={async () => {
              if (!pinned) await pins.pin(board);
              onOpen(board);
            }}
          />
        ) : (
          <Action title="Open Board" icon={Icon.ArrowRight} onAction={() => onOpen(board)} />
        )}
        {pinned ? (
          <Action
            title="Unpin Board"
            icon={Icon.TackDisabled}
            shortcut={Keyboard.Shortcut.Common.Pin}
            onAction={() => pins.unpin(board)}
          />
        ) : (
          <Action
            title="Pin Board"
            icon={Icon.Tack}
            shortcut={Keyboard.Shortcut.Common.Pin}
            onAction={() => pins.pin(board)}
          />
        )}
      </ActionPanel.Section>
      {pinned && pins.boards.length > 1 && (
        <ActionPanel.Section>
          {index > 0 && (
            <Action
              title="Make Default"
              icon={Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() => pins.makeDefault(board)}
            />
          )}
          {index > 0 && (
            <Action
              title="Move Higher"
              icon={Icon.ArrowUp}
              shortcut={Keyboard.Shortcut.Common.MoveUp}
              onAction={() => pins.move(board, -1)}
            />
          )}
          {index < pins.boards.length - 1 && (
            <Action
              title="Move Lower"
              icon={Icon.ArrowDown}
              shortcut={Keyboard.Shortcut.Common.MoveDown}
              onAction={() => pins.move(board, 1)}
            />
          )}
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        {url && <Action.OpenInBrowser title="Open in Jira" url={url} shortcut={Keyboard.Shortcut.Common.Open} />}
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onRefresh}
        />
      </ActionPanel.Section>
      <ExtensionActions />
    </ActionPanel>
  );
}
