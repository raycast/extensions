import { octokit } from "../util/gist-utils";
import { useCachedPromise } from "@raycast/utils";

export function useGistContent(rawUrl: string) {
  return useCachedPromise(
    (rawUrl: string) => {
      return octokit.request(`${rawUrl}`).then((response) => {
        return response.data;
      }) as Promise<string>;
    },
    [rawUrl],
  );
}
