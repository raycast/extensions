import { useCachedPromise } from "@raycast/utils";
import { ApiError } from "../lib/backend";
import { clearSession } from "../lib/session";
import { fetchBoard } from "../lib/gtd";

// The board comes back whole; each list command shows its column. Cached so a relaunch paints
// the last board at once and refreshes behind it. A 401 means the token is gone: drop the
// session so the next launch shows the login form.
export function useBoard(onSignedOut: () => Promise<void>) {
  return useCachedPromise(
    async () => {
      try {
        return await fetchBoard();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          await clearSession();
          await onSignedOut();
        }
        throw e;
      }
    },
    [],
    { keepPreviousData: true },
  );
}
