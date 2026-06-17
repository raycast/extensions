import { useCachedPromise } from "@raycast/utils";
import { getLists } from "../api/lists";

export default function useLists() {
  const { data, isLoading } = useCachedPromise(() => getLists());

  return { lists: data, isListLoading: isLoading };
}
