import { Detail } from "@raycast/api";
import { useCommitMessage } from "./useCommitMessage";
import { CommitActions } from "./CommitActions";
import { handleError } from "../../_lib/error-utils";
import { useEffect, useState } from "react";
import { getRepoDisplayName } from "../../_lib/git";

export function WriteCommitMessage() {
  const { commitMessage, error, branchName, isLoading } = useCommitMessage();
  const [repoPath, setRepoPath] = useState<string>("");

  useEffect(() => {
    fetchRepoPath();
    if (error) {
      handleError(error);
    }
  }, [error]);

  async function fetchRepoPath() {
    const displayName = await getRepoDisplayName();
    setRepoPath(displayName);
  }

  return (
    <Detail
      markdown={commitMessage || "Generating commit message..."}
      metadata={
        branchName && commitMessage ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Repository" text={repoPath} />
            <Detail.Metadata.Label title="Active Branch" text={branchName} />
          </Detail.Metadata>
        ) : null
      }
      actions={
        commitMessage ? (
          <CommitActions
            commitMessage={commitMessage}
            branchName={branchName}
            onError={(error) => handleError(error)}
          />
        ) : null
      }
      isLoading={isLoading}
    />
  );
}
