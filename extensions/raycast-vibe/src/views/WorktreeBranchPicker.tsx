import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import React from "react";
import { listBranches } from "../vibe";
import { addWorktree, directoryExists, worktreeDir } from "../worktrees";

type Branches = {
  local: { name: string; current: boolean }[];
  remote: { name: string; remote?: string; current: boolean }[];
};

export function WorktreeBranchPicker({
  repoRoot,
  onCreated,
}: {
  repoRoot: string;
  onCreated?: (worktreePath: string) => void;
}) {
  const { pop } = useNavigation();
  const [branches, setBranches] = React.useState<Branches>({
    local: [],
    remote: [],
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    void (async () => {
      try {
        const result = await listBranches(repoRoot);
        setBranches(result);
      } finally {
        setLoading(false);
      }
    })();
  }, [repoRoot]);

  const createFromLocal = async (branch: string) => {
    const targetDir = worktreeDir(repoRoot, branch);
    if (await directoryExists(targetDir)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Worktree directory already exists",
        message: targetDir,
      });
      return;
    }
    try {
      const path = await addWorktree(repoRoot, {
        branch,
        useExistingBranch: true,
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Worktree created",
        message: path,
      });
      onCreated?.(path);
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not create worktree",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const createFromRemote = async (
    branchLocalName: string,
    remoteRef: string,
  ) => {
    const targetDir = worktreeDir(repoRoot, branchLocalName);
    if (await directoryExists(targetDir)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Worktree directory already exists",
        message: targetDir,
      });
      return;
    }
    const confirmed = await confirmAlert({
      title: "Create tracking branch and worktree?",
      message: `Create local branch '${branchLocalName}' tracking '${remoteRef}' and check it out as a worktree at ${targetDir}?`,
      primaryAction: {
        title: "Create",
        style: Alert.ActionStyle.Default,
      },
    });
    if (!confirmed) return;
    try {
      const path = await addWorktree(repoRoot, {
        branch: branchLocalName,
        remote: remoteRef,
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Worktree created",
        message: path,
      });
      onCreated?.(path);
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not create worktree",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <List
      navigationTitle="Check Out Branch as Worktree"
      searchBarPlaceholder="Search branches…"
      isLoading={loading}
    >
      <List.Section title="Local Branches">
        {branches.local.map((branch) => (
          <List.Item
            key={`local/${branch.name}`}
            icon={branch.current ? Icon.Checkmark : Icon.Circle}
            title={branch.name}
            actions={
              <ActionPanel>
                <Action
                  title="Create Worktree"
                  icon={Icon.Plus}
                  onAction={() => void createFromLocal(branch.name)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Remote Branches">
        {branches.remote.map((branch) => (
          <List.Item
            key={`remote/${branch.remote}`}
            icon={Icon.Globe}
            title={branch.name}
            subtitle={branch.remote}
            actions={
              <ActionPanel>
                <Action
                  title="Create Tracking Branch and Worktree"
                  icon={Icon.Plus}
                  onAction={() =>
                    branch.remote &&
                    void createFromRemote(branch.name, branch.remote)
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
