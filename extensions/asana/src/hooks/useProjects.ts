import { useCachedPromise } from "@raycast/utils";
import { getProjects } from "../api/projects";

export function useProjects(workspace?: string) {
  return useCachedPromise((workspace) => getProjects(workspace), [workspace], { execute: !!workspace });
}
