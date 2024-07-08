import { useCachedPromise } from "@raycast/utils";
import { readStickies, StickiesNote } from "../utils/stickies-utils";

export function useStickies() {
  return useCachedPromise(() => {
    return readStickies() as Promise<StickiesNote[]>;
  });
}
