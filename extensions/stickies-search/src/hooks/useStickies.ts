import { useCachedPromise } from "@raycast/utils";
import { readStickies } from "../utils/stickies-utils";

export function useStickies() {
  return useCachedPromise(() => readStickies());
}
