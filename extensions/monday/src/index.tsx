import { ActionPanel, Image, List, Action, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import AddItem from "./addItem";
import { Me, Board, Account } from "./lib/models";
import {
  getCachedBoards,
  cacheBoards,
  getCachedUser,
  cacheUser,
} from "./lib/persistence";
import { getBoardsAndUser } from "./lib/api";
import { ErrorView } from "./lib/helpers";

export default function BoardsList() {
  const [state, setState] = useState<{
    isLoading: boolean;
    boards: Board[];
    me?: Me;
    error?: string;
  }>({ isLoading: true, boards: [] });
  useEffect(() => {
    async function fetch() {
      // Fetch from cache first
      const [cachedBoards, cachedUser] = await Promise.all([
        getCachedBoards(),
        getCachedUser(),
      ]);
      if (cachedBoards && cachedUser) {
        setState((oldState) => ({
          ...oldState,
          boards: cachedBoards,
          me: cachedUser,
        }));
      }

      try {
        // In any case, fetch remote and re-fill cache and state
        const response = await getBoardsAndUser();
        await Promise.all([
          cacheUser(response.me),
          cacheBoards(response.boards),
        ]);

        setState((oldState) => ({
          ...oldState,
          boards: response.boards || [],
          me: response.me,
          isLoading: false,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          error: error as string,
        }));
      }
    }
    fetch();
  }, []);

  const account = state.me?.account;
  if (state.error) {
    return <ErrorView error={state.error} />;
  } else if (account) {
    return (
      <List
        isLoading={state.isLoading}
        searchBarPlaceholder="Filter boards by name..."
      >
        {state.boards.map((board) => BuildBoardItem({ board, account }))}
      </List>
    );
  } else {
    return <List isLoading={true}></List>;
  }
}

function BuildBoardItem({
  board,
  account,
}: {
  board: Board;
  account: Account;
}) {
  return (
    <List.Item
      id={board.id.toString()}
      key={board.id.toString()}
      title={board.name}
      icon={{
        source: board.owner.photo_thumb,
        mask: Image.Mask.Circle,
      }}
      subtitle={board.workspace?.name ?? "Main Workspace"}
      accessoryTitle={getPrettyDate(new Date(board.updated_at))}
      actions={getBoardActions(board, account)}
    />
  );
}

function getPrettyDate(date: Date): string {
  const theDate = new Date(date);

  const delta = Math.round((+new Date() - theDate.getTime()) / 1000);

  const minute = 60,
    hour = minute * 60,
    day = hour * 24,
    week = day * 7,
    month = week * 4,
    year = month * 12;

  let fuzzy;

  if (delta < 30) {
    fuzzy = "just then";
  } else if (delta < minute) {
    fuzzy = delta + " seconds ago";
  } else if (delta < 2 * minute) {
    fuzzy = "a minute ago";
  } else if (delta < hour) {
    fuzzy = Math.floor(delta / minute) + " minutes ago";
  } else if (Math.floor(delta / hour) == 1) {
    fuzzy = "1 hour ago";
  } else if (delta < day) {
    fuzzy = Math.floor(delta / hour) + " hours ago";
  } else if (delta < day * 2) {
    fuzzy =
      "yesterday, " +
      theDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
  } else if (delta < week) {
    fuzzy = Math.floor(delta / day) + " days ago";
  } else if (delta < month) {
    fuzzy = Math.floor(delta / week) + " weeks ago";
  } else if (delta < year) {
    const months = Math.floor(delta / month);
    fuzzy = months + (months == 1 ? " month ago" : " months ago");
  } else {
    const years = Math.floor(delta / year);
    fuzzy = years + (years == 1 ? " year ago" : " years ago");
  }

  return `Last updated: ${fuzzy}`;
}

function getBoardActions(board: Board, account: Account) {
  const boardUrl = `https://${account.slug}.monday.com/boards/${board.id}`;

  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open Board" url={boardUrl} />
      <Action.Push
        title="Add an item"
        target={<AddItem board={board} />}
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd"], key: "enter" }}
      />
      <Action.CopyToClipboard
        title="Copy board link"
        content={boardUrl}
        shortcut={{ modifiers: ["opt"], key: "c" }}
      />
    </ActionPanel>
  );
}
