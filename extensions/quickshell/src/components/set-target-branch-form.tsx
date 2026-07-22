import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
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

  const { handleSubmit, itemProps, setValue } = useForm<{ branch: string }>({
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

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Target Branch" onSubmit={handleSubmit} />
          <Action
            title="Load Local Branches"
            onAction={async () => {
              const branches = await listLocalBranches(directory);
              if (branches.length === 0) {
                await showToast({ style: Toast.Style.Failure, title: "No local branches found" });
                return;
              }
              setValue("branch", branches[0]);
              await showToast({
                style: Toast.Style.Success,
                title: "Branches loaded",
                message: branches.slice(0, 8).join(", "),
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Set the launch target branch for ${workspaceName}.`} />
      <Form.TextField title="Branch" placeholder="main" {...itemProps.branch} />
    </Form>
  );
}
