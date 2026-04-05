import { useCachedPromise } from "@raycast/utils";
import { getProjects } from "../api/projects";
import { handleUseCachedPromiseError } from "../helpers/errors";

export function useProjects() {
  return useCachedPromise(() => getProjects(), [], {
    onError: handleUseCachedPromiseError,
  });
}
