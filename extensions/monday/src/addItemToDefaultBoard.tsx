import { Form, getPreferenceValues } from "@raycast/api";

import { Board, Me } from "./lib/models";
import { useState, useEffect } from "react";
import { getBoardAndUser } from "./lib/api";
import {
  getCachedUser,
  getCachedBoard,
  cacheBoard,
  cacheUser,
} from "./lib/persistence";
import AddItem from "./addItem";
import { ErrorView } from "./lib/helpers";

export default function AddItemToDefaultBoard() {
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
        getCachedBoard(),
        getCachedUser(),
      ]);
      if (
        cachedBoard &&
        cachedUser &&
        cachedBoard.id === getPreferenceValues().addToBoardId
      ) {
        setState((oldState) => ({
          ...oldState,
          board: cachedBoard,
          me: cachedUser,
        }));
      }

      try {
        // In any case, fetch remote and re-fill cache and state
        const response = await getBoardAndUser();
        await Promise.all([
          cacheUser(response.me),
          cacheBoard(response.boards[0]),
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
    console.log("error view");
    return <ErrorView error={state.error} />;
  } else if (board) {
    console.log("theres a board");
    return <AddItem board={board} />;
  } else {
    console.log("theres no board");
    return <Form isLoading={true}></Form>;
  }
}
