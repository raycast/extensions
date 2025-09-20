import { useMemo } from "react";
import { ActionPanel } from "@raycast/api";
import { RemoteGitActions } from "./RemoteGitActions.js";
import { AddFile } from "../actions/AddFile.js";
import { UnstageFile } from "../actions/UnstageFile.js";
import { CommitMessage } from "../actions/CommitMessage.js";
import { ResetFile } from "../actions/ResetFile.js";
import { ChangeCurrentBranch } from "../actions/ChangeCurrentBranch.js";
import { SetRepo } from "../actions/SetRepo.js";
import { CopyFilename } from "../actions/CopyFilename.js";
import { OpenFile } from "../actions/OpenFile.js";
import { AddAllFiles } from "../actions/AddAllFiles.js";
import { UnstageAllFiles } from "../actions/UnstageAllFiles.js";
import { StashAllFiles } from "../actions/StashAllFiles.js";
import { FileDiff } from "../actions/FileDiff.js";
import { ResetAllUnstagedFiles } from "../actions/ResetAllFiles.js";

interface Props {
  isNotStaged: boolean;
  isCommittedFile: boolean;
  isShowingDiff: boolean;
  fileName: string;
  updateDiff: (data: string) => void;
}

export function GitStatusItemActions({ isNotStaged, isCommittedFile, isShowingDiff, fileName, updateDiff }: Props) {
  const mainAction = useMemo(() => {
    return isNotStaged ? <AddFile fileName={fileName} /> : <UnstageFile fileName={fileName} />;
  }, [fileName, isNotStaged]);

  const restoreFile = useMemo(() => {
    if (!isNotStaged || !isCommittedFile) {
      return null;
    }

    return (
      <>
        <FileDiff fileName={fileName} updateDiff={updateDiff} isShowingDiff={isShowingDiff} />
        <ResetFile fileName={fileName} />
      </>
    );
  }, [fileName, isCommittedFile, isNotStaged, isShowingDiff, updateDiff]);

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {mainAction}
        <CommitMessage />
        {restoreFile}
      </ActionPanel.Section>

      <ChangeCurrentBranch />

      <ActionPanel.Section title="Bulk Actions">
        <AddAllFiles />
        <UnstageAllFiles />
        <ResetAllUnstagedFiles />
        <StashAllFiles />
      </ActionPanel.Section>

      <RemoteGitActions />

      <ActionPanel.Section title="Utilities">
        <SetRepo />
        <CopyFilename fileName={fileName} />
        <OpenFile fileName={fileName} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
