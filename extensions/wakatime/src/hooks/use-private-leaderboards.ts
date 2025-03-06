import { useCallback } from "react";

import { useBase } from "./base";
import { getPrivateLeaderBoards } from "../utils";

export function usePrivateLeaderBoards() {
  const result = useBase({
    handler: useCallback(getPrivateLeaderBoards, []),
    toasts: {
      loading: { title: "Loading Private Leaderboards" },
      success: { title: "Done!!" },
      error: (err) => ({
        title: "Failed fetching data!",
        message: err.message,
      }),
    },
  });

  return result;
}
