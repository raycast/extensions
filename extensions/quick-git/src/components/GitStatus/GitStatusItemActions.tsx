import { memo } from "react";
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
import { useSelectedRepo } from "../../hooks/useRepo.js";
import { SwitchToSubmodule } from "../actions/SwitchToSubmodule.js";
import { ChangeSubmodules } from "../actions/ChangeSubmodules.js";
import { useHasSubmodles } from "../../hooks/useHasSubmodules.js";

interface Props {
  isNotStaged: boolean;
  isCommittedFile: boolean;
  isShowingDiff: boolean;
  isSubmodule: boolean;
  fileName: string;
  updateDiff: (data: string) => void;
}

export const GitStatusItemActions = memo(function GitStatusItemActions({
  isNotStaged,
  isCommittedFile,
  isShowingDiff,
  isSubmodule,
  fileName,
  updateDiff,
}: Props) {
  const repo = useSelectedRepo();
  const { data: hasSubmodule } = useHasSubmodles(repo.value);
  const mainAction = isNotStaged ? <AddFile fileName={fileName} /> : <UnstageFile fileName={fileName} />;

  const restoreFile = () => {
    if (!isNotStaged || !isCommittedFile) {
      return null;
    }

    return (
      <>
        <FileDiff fileName={fileName} updateDiff={updateDiff} isShowingDiff={isShowingDiff} />
        <ResetFile fileName={fileName} />
      </>
    );
  };

  const submoduleActions = () => {
    if (!repo.value || (!hasSubmodule && !isSubmodule)) return null;
    if (hasSubmodule && !isSubmodule) return <ChangeSubmodules changeRepo={repo.setValue} />;
    return (
      <ActionPanel.Section title="Submodules">
        <SwitchToSubmodule submodulePath={fileName} updateRepo={repo.setValue} />
        <ChangeSubmodules changeRepo={repo.setValue} />
      </ActionPanel.Section>
    );
  };

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {mainAction}
        <CommitMessage />
        {restoreFile()}
      </ActionPanel.Section>

      <ChangeCurrentBranch />
      {submoduleActions()}

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
});
