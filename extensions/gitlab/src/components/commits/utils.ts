import { useState, useEffect } from "react";
import { useCache } from "../../cache";
import { gitlab } from "../../common";
import { CommitStatus } from "./list";

export async function getCommitStatus(projectID: number, sha: string): Promise<CommitStatus | undefined> {
  const status: CommitStatus | undefined = await gitlab
    .fetch(`projects/${projectID}/repository/commits/${sha}/statuses`)
    .then((d) => {
      if (d && d.length > 0) {
        for (const s of d) {
          if (s.status !== "success") {
            return s;
          }
        }
        return d[0] as CommitStatus;
      }
      return undefined;
    });
  return status;
}

export function useCommitStatus(projectID: number, sha?: string): { commitStatus: CommitStatus | undefined } {
  const [commitStatus, setCommitStatus] = useState<CommitStatus | undefined>();
  const { data } = useCache<CommitStatus | undefined>(
    `project_commit_status_${projectID}_${sha}`,
    async (): Promise<CommitStatus | undefined> => {
      if (sha) {
        return await getCommitStatus(projectID, sha);
      }
      return undefined;
    },
    {
      deps: [projectID, sha],
      secondsToRefetch: 30,
    },
  );
  useEffect(() => {
    setCommitStatus(data);
  }, [data]);
  return { commitStatus };
}
