import { Form, getPreferenceValues } from "@raycast/api";

import { Board, Me } from "./lib/models";
import { useState, useEffect } from "react";
import { getBoardAndUser } from "./lib/api";
import {
  getCachedUser,
  getCachedQuickAddBoard,
  cacheQuickAddBoard,
  cacheUser,
} from "./lib/persistence";
import AddItem from "./addItem";
import { ErrorView } from "./lib/helpers";

export default function QuickAddItem() {
  const [state, setState] = useState<{
    isLoading: boolean;
    board?: Board;
    me?: Me;
    error?: string;
  }>({ isLoading: true });
  useEffect(() => {
    async function fetch() {
      // Fetch from cache first
      const [cachedBoard, cachedUser] = await Promise.all([
        getCachedQuickAddBoard(),
        getCachedUser(),
      ]);
      if (
        cachedBoard &&
        cachedUser &&
        cachedBoard.id === getPreferenceValues().quickAddBoardId
      ) {
        setState((oldState) => ({
          ...oldState,
          board: cachedBoard,
          me: cachedUser,
        }));
      }

      try {
        // In any case, fetch remote and re-fill cache and state
        const boardId = getPreferenceValues().quickAddBoardId.toString();
        const response = await getBoardAndUser(boardId);
        await Promise.all([
          cacheUser(response.me),
          cacheQuickAddBoard(response.boards[0]),
        ]);

        setState((oldState) => ({
          ...oldState,
          board: response.boards[0] || null,
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

  const board = state.board;
  if (state.error) {
    return (
      <ErrorView
        error={`Sorry but we failed accessing the defined board. Inner error: ${state.error}`}
      />
    );
  } else if (board) {
    return <AddItem board={board} />;
  } else {
    return <Form isLoading={true}></Form>;
  }
}
