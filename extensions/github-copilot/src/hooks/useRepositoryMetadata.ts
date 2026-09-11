import { useCachedPromise } from "@raycast/utils";
import { fetchOpenIssues } from "../services/issues";

export function useRepositoryMetadata(repository: string) {
  const { data, isLoading } = useCachedPromise(fetchOpenIssues, [repository], {
    execute: Boolean(repository),
  });

  return {
    repositoryId: data?.repositoryId,
    copilotBotId: data?.copilotBotId,
    isLoading,
  };
}
