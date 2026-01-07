import { useCachedPromise } from "@raycast/utils";
import { getCurrentUser } from "../api";

export function useCurrentUser() {
  return useCachedPromise(getCurrentUser, [], {
    keepPreviousData: true,
  });
}
