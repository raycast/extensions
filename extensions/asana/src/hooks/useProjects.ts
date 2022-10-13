import { useCachedPromise } from "@raycast/utils";
import { getProjects } from "../api/projects";
import { handleUseCachedPromiseError } from "../helpers/errors";

export function useProjects(workspace?: string) {
  return useCachedPromise((workspace) => getProjects(workspace), [workspace], {
    execute: !!workspace,
    onError(error) {
      handleUseCachedPromiseError(error);
    },
  });
}
