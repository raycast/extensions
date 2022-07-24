import { useBase } from "./base";
import { getLeaderBoard } from "../utils";

export function useLeaderBoard({ id, page }: { id?: string; page?: number } = {}) {
  const result = useBase({
    handler: () => getLeaderBoard({ id, page }),
    toasts: {
      loading: { title: "Loading Leaderboard" },
      success: { title: "Done!!" },
      error: (err) => ({
        title: "Failed fetching data!",
        message: err.message,
      }),
    },
  });

  return result;
}
