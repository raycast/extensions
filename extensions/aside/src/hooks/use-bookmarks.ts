import { useCachedPromise } from "@raycast/utils";
import { listBookmarks } from "../lib/browser";

export function useBookmarks() {
  return useCachedPromise(listBookmarks, [], { keepPreviousData: true });
}
