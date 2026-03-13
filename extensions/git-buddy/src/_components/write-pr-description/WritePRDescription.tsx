import { Detail } from "@raycast/api";
import { usePRDescription } from "./usePRDescription";
import { PRDescriptionActions } from "./PRDescriptionActions";
import { handleError } from "../../_lib/error-utils";
import { useEffect, useState } from "react";
import { getRepoDisplayName } from "../../_lib/git";

interface WritePRDescriptionProps {
  baseBranch?: string;
}

export function WritePRDescription({ baseBranch = "main" }: WritePRDescriptionProps) {
  const { description, error, branchName, isLoading } = usePRDescription(baseBranch);
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
      markdown={description || "Generating PR description..."}
      metadata={
        branchName && description ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Repository" text={repoPath} />
            <Detail.Metadata.Label title="Current Branch" text={branchName} />
            {baseBranch && <Detail.Metadata.Label title="Base Branch" text={baseBranch} />}
          </Detail.Metadata>
        ) : null
      }
      actions={description ? <PRDescriptionActions description={description} branchName={branchName} /> : null}
      isLoading={isLoading}
    />
  );
}
