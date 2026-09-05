import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { useEffect } from "react";
import {
  evaluateAfterSettingTarget,
  isSafeGitBranchName,
  listLocalBranches,
  resolveWorktreeKey,
} from "../lib/git-launch-gate";
import { getQuickShellStorage } from "../lib/raycast-storage";
import { showStorageFailure } from "../lib/failure-feedback";

type Props = {
  directory: string;
  workspaceName: string;
  blockDirtyBranchSwitch: boolean;
  onSaved?: () => Promise<void>;
};

export default function SetTargetBranchForm({ directory, workspaceName, blockDirtyBranchSwitch, onSaved }: Props) {
  const { pop } = useNavigation();
  const storage = getQuickShellStorage();

  const {
    data: branchChoices,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async (dir: string) => {
      const branches = await listLocalBranches(dir);
      const worktreeKey = await resolveWorktreeKey(dir);
      const target = worktreeKey ? await storage.getBranchTarget(worktreeKey) : null;
      return { branches, target };
    },
    [directory],
  );

  const { handleSubmit, itemProps, setValue, values } = useForm<{ branch: string }>({
    async onSubmit(values) {
      const branch = values.branch.trim();
      if (!branch) {
        await showToast({ style: Toast.Style.Failure, title: "Branch required" });
        return;
      }
      if (!isSafeGitBranchName(branch)) {
        await showToast({ style: Toast.Style.Failure, title: "Invalid branch name" });
        return;
      }

      try {
        const worktreeKey = await resolveWorktreeKey(directory);
        if (!worktreeKey) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Not a git repository",
            message: directory,
          });
          return;
        }

        await storage.setBranchTarget(worktreeKey, branch);

        const gate = await evaluateAfterSettingTarget(directory, branch, blockDirtyBranchSwitch);
        if (gate.canProceed) {
          await showToast({
            style: Toast.Style.Success,
            title: "Target branch set",
            message: `${workspaceName} → ${branch}`,
          });
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Target saved",
            message: gate.message ?? "Could not switch to the target branch.",
          });
        }

        await onSaved?.();
        pop();
      } catch (error) {
        await showStorageFailure("Set target branch", error);
      }
    },
    validation: {
      branch: (value) => {
        const trimmed = value?.trim() ?? "";
        if (!trimmed) {
          return "Enter a branch name";
        }
        if (!isSafeGitBranchName(trimmed)) {
          return "Invalid branch name";
        }
        return undefined;
      },
    },
  });

  useEffect(() => {
    const branches = branchChoices?.branches ?? [];
    if (values.branch || branches.length === 0) {
      return;
    }
    setValue(
      "branch",
      branchChoices?.target && branches.includes(branchChoices.target) ? branchChoices.target : branches[0],
    );
  }, [branchChoices, setValue, values.branch]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Switch Branch…" onSubmit={handleSubmit} />
          {error ? <Action title="Retry Loading Branches" onAction={() => void revalidate()} /> : null}
        </ActionPanel>
      }
    >
      <Form.Description text={`Choose the branch Quick Shell should switch ${workspaceName} to before launch.`} />
      {error ? (
        <>
          <Form.Description
            title="Branches unavailable"
            text={`${error.message} Enter a local branch manually or retry from Actions.`}
          />
          <Form.TextField title="Branch" placeholder="main" {...itemProps.branch} />
        </>
      ) : !branchChoices ? null : branchChoices.branches.length === 0 ? (
        <>
          <Form.Description title="Branches" text="No local branches were found. Enter one manually." />
          <Form.TextField title="Branch" placeholder="main" {...itemProps.branch} />
        </>
      ) : (
        <Form.Dropdown title="Branch" placeholder="Search local branches..." {...itemProps.branch}>
          {branchChoices.branches.map((branch) => (
            <Form.Dropdown.Item key={branch} value={branch} title={branch} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
