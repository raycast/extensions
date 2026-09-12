import { ActionPanel, List } from "@raycast/api";
import { memo } from "react";
import { RepoDir } from "../../utils/repos.js";
import { SelectCurrentRepo } from "../actions/ChangeCurrentRepo.js";
import { ChooseSpecificRepo } from "../actions/ChooseSpecificRepo.js";
import { OpenDirectory } from "../actions/OpenDirectory.js";
import { CheckStatus } from "../actions/CheckStatus.js";

interface Props {
  repoDir: RepoDir;
  isSelected: boolean;
  changeRepo: (item: RepoDir) => void;
}

export const GitRepoItem = memo(function GitRepoItem({ repoDir, isSelected, changeRepo }: Props) {
  const accessories = isSelected ? [{ text: "Current Repo" }] : null;

  const selectRepo = () => {
    changeRepo(repoDir);
  };

  const selectedActions = isSelected ? <CheckStatus /> : <SelectCurrentRepo selectRepo={selectRepo} />;

  return (
    <List.Item
      title={repoDir.label}
      accessories={accessories}
      actions={
        <ActionPanel>
          {selectedActions}
          <OpenDirectory path={repoDir.id} />
          <ChooseSpecificRepo />
        </ActionPanel>
      }
    />
  );
});
