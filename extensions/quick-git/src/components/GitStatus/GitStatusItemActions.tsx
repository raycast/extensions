import { useMemo } from "react";
import { ActionPanel } from "@raycast/api";
import { RemoteGitActions } from "./RemoteGitActions.js";
import { AddFile } from "../actions/AddFile.js";
import { UnstageFile } from "../actions/UnstageFile.js";
import { CommitMessage } from "../actions/CommitMessage.js";
import { RestoreFile } from "../actions/RestoreFile.js";
import { ChangeCurrentBranch } from "../actions/ChangeCurrentBranch.js";
import { SetRepo } from "../actions/SetRepo.js";
import { CopyFilename } from "../actions/CopyFilename.js";
import { OpenFile } from "../actions/OpenFile.js";
import { AddAllFiles } from "../actions/AddAllFiles.js";
import { UnstageAllFiles } from "../actions/UnstageAllFiles.js";
import { StashAllFiles } from "../actions/StashAllFiles.js";
import { FileDiff } from "../actions/FileDiff.js";

interface Props {
  isNotStaged: boolean;
  isCommittedFile: boolean;
  isShowingDiff: boolean;
  fileName: string;
  checkStatus: () => void;
  updateDiff: (data: string) => void;
}

export function GitStatusItemActions({
  isNotStaged,
  isCommittedFile,
  isShowingDiff,
  fileName,
  checkStatus,
  updateDiff,
}: Props) {
  const mainAction = useMemo(() => {
    return isNotStaged ? (
      <AddFile fileName={fileName} checkStatus={checkStatus} />
    ) : (
      <UnstageFile fileName={fileName} checkStatus={checkStatus} />
    );
  }, [checkStatus, fileName, isNotStaged]);

  const restoreFile = useMemo(() => {
    if (!isNotStaged || !isCommittedFile) {
      return null;
    }

    return (
      <>
        <FileDiff fileName={fileName} updateDiff={updateDiff} isShowingDiff={isShowingDiff} />
        <RestoreFile fileName={fileName} checkStatus={checkStatus} />
      </>
    );
  }, [checkStatus, fileName, isCommittedFile, isNotStaged, isShowingDiff, updateDiff]);

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {mainAction}
        <CommitMessage checkStatus={checkStatus} />
        {restoreFile}
      </ActionPanel.Section>

      <ChangeCurrentBranch checkStatus={checkStatus} />

      <ActionPanel.Section title="Bulk Actions">
        <AddAllFiles checkStatus={checkStatus} />
        <UnstageAllFiles checkStatus={checkStatus} />
        <StashAllFiles checkStatus={checkStatus} />
      </ActionPanel.Section>

      <RemoteGitActions checkStatus={checkStatus} />

      <ActionPanel.Section title="Utilities">
        <SetRepo />
        <CopyFilename fileName={fileName} />
        <OpenFile fileName={fileName} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
