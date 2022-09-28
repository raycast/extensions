import { useCachedPromise } from "@raycast/utils";
import { getWorkspaces } from "../api/workspaces";

export function useWorkspaces() {
  return useCachedPromise(getWorkspaces);
}
