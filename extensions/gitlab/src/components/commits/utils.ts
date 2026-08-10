import { useCachedPromise } from "@raycast/utils";
import { gitlab } from "../../common";
import { CommitStatus } from "./types";

export async function getCommitStatus(projectID: number, sha: string): Promise<CommitStatus | undefined> {
  const status: CommitStatus | undefined = await gitlab
    .fetch(`projects/${projectID}/repository/commits/${sha}/statuses`)
    .then((statuses) => {
      if (statuses && statuses.length > 0) {
        for (const commitStatus of statuses) {
          if (commitStatus.status !== "success") {
            return commitStatus;
          }
        }
        return statuses[0] as CommitStatus;
      }
      return undefined;
    });
  return status;
}

export function useCommitStatus(
  projectID: number,
  sha?: string,
): { commitStatus: CommitStatus | undefined; isLoading: boolean } {
  const { data, isLoading } = useCachedPromise(
    (projectId: number, commitSha: string) => getCommitStatus(projectId, commitSha),
    [projectID, sha ?? ""],
    { execute: !!sha },
  );
  return { commitStatus: data, isLoading };
}
