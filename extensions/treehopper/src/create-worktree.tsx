import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getPreferences, getRepos } from "./utils/config";
import { createWorktree } from "./utils/git";

interface BranchOption {
  repo: string;
  branch: string;
  isHotfix: boolean;
}

export default function CreateWorktree() {
  const [options, setOptions] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    const repos = getRepos();
    const opts: BranchOption[] = [];

    for (const repo of repos) {
      opts.push({
        repo: repo.name,
        branch: repo.defaultBranch,
        isHotfix: false,
      });
      if (repo.hotfixBranch) {
        opts.push({
          repo: repo.name,
          branch: repo.hotfixBranch,
          isHotfix: true,
        });
      }
    }

    setOptions(opts);
    setIsLoading(false);
  }, []);

  if (!isLoading && options.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Tree}
          title="Not configured"
          description="Configure repos or enable auto-discover in preferences"
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Select repository and base branch..."
    >
      {options.map((opt) => {
        const title = `${opt.repo} (from ${opt.branch})`;
        const subtitle = opt.isHotfix
          ? `Create hotfix worktree from ${opt.branch} branch`
          : `Create new worktree from ${opt.branch} branch`;

        return (
          <List.Item
            key={`${opt.repo}:${opt.branch}`}
            icon={Icon.Plus}
            title={title}
            subtitle={subtitle}
            actions={
              <ActionPanel>
                <Action
                  title="Create Worktree"
                  icon={Icon.Plus}
                  onAction={() =>
                    push(
                      <WorktreeForm repo={opt.repo} baseBranch={opt.branch} />,
                    )
                  }
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function WorktreeForm({
  repo,
  baseBranch,
}: {
  repo: string;
  baseBranch: string;
}) {
  const prefs = getPreferences();
  const [branchName, setBranchName] = useState("feat/");
  const [isCreating, setIsCreating] = useState(false);

  async function handleSubmit() {
    if (!branchName.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Branch name required",
      });
      return;
    }

    setIsCreating(true);
    await showToast({
      style: Toast.Style.Animated,
      title: "Creating worktree in terminal...",
    });

    const result = createWorktree(repo, baseBranch, branchName);

    if (result.success) {
      await showToast({
        style: Toast.Style.Success,
        title: "Worktree creation started",
        message: "Check terminal for progress",
      });
      await closeMainWindow();
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create worktree",
        message: result.error,
      });
    }

    setIsCreating(false);
  }

  return (
    <Form
      isLoading={isCreating}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Worktree"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Creating worktree for ${repo} from ${baseBranch}`}
      />
      <Form.TextField
        id="branchName"
        title="New Branch Name"
        placeholder="feat/my-feature"
        value={branchName}
        onChange={setBranchName}
        info={`New branch will be created from ${baseBranch}`}
      />
      <Form.Description
        text={`Will run setup in terminal, then open in ${prefs.editor}`}
      />
    </Form>
  );
}
