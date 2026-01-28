import { fetchItemInput, ItemInput } from "../utils/input-utils";
import { usePromise } from "@raycast/utils";

export function useItemInput() {
  return usePromise(() => {
    return fetchItemInput() as Promise<ItemInput>;
  });
}
