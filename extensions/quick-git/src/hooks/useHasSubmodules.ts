import { useCachedPromise } from "@raycast/utils";
import { hasSubmodules } from "../utils/submodules.js";

export function useHasSubmodules(repo?: string) {
  return useCachedPromise(hasSubmodules, [repo], { execute: !!repo });
}
