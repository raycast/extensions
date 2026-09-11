import { Action, Icon, showToast } from "@raycast/api";
import { useRepo } from "../../hooks/useRepo.js";
import { join } from "node:path";
import { useCheckStatus } from "../../hooks/useGitStatus.js";
import { showFailureToast } from "@raycast/utils";

interface Props {
  submodulePath: string;
  updateRepo: (repoDir: string) => Promise<void>;
}

export function SwitchToSubmodule({ submodulePath, updateRepo }: Props) {
  const repo = useRepo();
  const checkStatus = useCheckStatus();
  const updateCurrentRepo = () => {
    const path = join(repo, submodulePath);
    updateRepo(path)
      .then(() => {
        checkStatus();
        showToast({ title: `Updated repo to be ${path}` });
      })
      .catch((error) => {
        showFailureToast(error, { title: "Could not update repo" });
      });
  };

  return (
    <Action
      title="Switch to Submodule"
      icon={Icon.Reply}
      onAction={updateCurrentRepo}
      shortcut={{ macOS: { key: "s", modifiers: ["cmd"] }, Windows: { key: "s", modifiers: ["ctrl"] } }}
    />
  );
}
