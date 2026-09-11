import { useCachedPromise } from "@raycast/utils";
import { useRepo } from "./useRepo.js";
import { findWorktreeDir } from "../utils/worktrees.js";

export function useWorktreeDir(name: string) {
  const repo = useRepo();
  return useCachedPromise(findWorktreeDir, [repo, name]);
}
