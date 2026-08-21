import { useCachedPromise } from "@raycast/utils";

import { getAuthProvider } from "../auth";
import type { AuthSession } from "../auth";

export function useSession(options?: { interactive?: boolean }): {
  session: AuthSession | undefined;
  isLoading: boolean;
  error: Error | undefined;
} {
  const interactive = options?.interactive !== false;
  const { data, isLoading, error } = useCachedPromise(
    (shouldPrompt: boolean) => (shouldPrompt ? getAuthProvider().getSession() : getAuthProvider().getCachedSession()),
    [interactive],
    { keepPreviousData: true },
  );

  return { session: data, isLoading, error };
}
