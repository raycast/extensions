import { memo } from "react";
import { ActionPanel, useNavigation } from "@raycast/api";
import { ViewRemote } from "../actions/ViewRemote.js";
import { SwitchToSubmodule } from "../actions/SwitchToSubmodule.js";
import { useCheckStatus } from "../../hooks/useGitStatus.js";

interface Props {
  url: string;
  path: string;
  updateRepo: (repoDir: string) => Promise<void>;
}

export const GitSubmoduleItemActions = memo(function GitSubmoduleItemActions({ url, path, updateRepo }: Props) {
  const checkStatus = useCheckStatus();
  const { pop } = useNavigation();

  const updateRepoAndNavigate = (repoDir: string) =>
    updateRepo(repoDir).then(() => {
      checkStatus();
      pop();
    });

  return (
    <ActionPanel>
      <SwitchToSubmodule submodulePath={path} updateRepo={updateRepoAndNavigate} />
      <ViewRemote url={url} />
    </ActionPanel>
  );
});
