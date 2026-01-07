import { useCachedPromise } from "@raycast/utils";
import { getUsers } from "../api";

export function useUsers() {
  return useCachedPromise(getUsers, [], {
    keepPreviousData: true,
  });
}
