import { useCachedPromise } from "@raycast/utils";
import { GitManager } from "../utils/git-manager";
import { Remote } from "../types";
import { remoteHostParser } from "../utils/remote-host-parser";
import { RepositoryContext } from "../open-repository";
import { useMemo } from "react";

export type RemotesHosts = Record<string, Remote>;

/**
 * Hook for fetching Git remotes metadata.
 * Returns a dictionary keyed by remote name.
 * Repository path is included in cache dependencies to ensure separate cache per repository.
 */
export function useGitRemotes(gitManager: GitManager): RepositoryContext["remotes"] {
  const {
    data: remotes,
    isLoading,
    revalidate,
  } = useCachedPromise(async (_repoPath: string) => gitManager.getRemotes(), [gitManager.repoPath], {
    initialData: [],
  });

  const remotesRecords: RemotesHosts = useMemo(
    () =>
      remotes.reduce<RemotesHosts>((dictionary, remote) => {
        const primaryUrl = remote.fetchUrl || remote.pushUrl || "";
        const parser = remoteHostParser(primaryUrl);

        const info: Remote = {
          name: remote.name,
          fetchUrl: remote.fetchUrl,
          pushUrl: remote.pushUrl,
          type: detectRemoteProtocol(primaryUrl),
          organizationName: parser.organizationName,
          displayName: `${parser.organizationName}/${parser.repositoryName}`,
          repositoryName: parser.repositoryName,
          provider: parser.provider,
          avatarUrl: parser.avatarUrl,
          webPages: parser.webPages,
        };
        dictionary[remote.name] = info;

        return dictionary;
      }, {} as RemotesHosts),
    [remotes],
  );

  return {
    data: remotesRecords,
    isLoading,
    revalidate,
  };
}

function detectRemoteProtocol(url: string): "ssh" | "http" {
  const lower = url.toLowerCase();

  if (lower.startsWith("ssh://") || /^[^@\s]+@[^:]+:/.test(url)) {
    return "ssh";
  }

  return "http";
}
