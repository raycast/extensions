import { useState } from "react";
import { Action, ActionPanel, Form, Icon, showToast, useNavigation } from "@raycast/api";
import { showFailureToast, useExec, useForm } from "@raycast/utils";
import { useRepoStorage } from "../../hooks/useRepo.js";
import path from "node:path";
import { validateBranchName } from "../../utils/validators.js";

interface Props {
  checkBranches: () => void;
}

export function CreateWorktree({ checkBranches }: Props) {
  const repo = useRepoStorage();
  const { pop } = useNavigation();
  const [worktreeName, setWorktreeName] = useState("");
  const [worktreeDir, setWorktreeDir] = useState("");
  const { isLoading } = useExec("git", ["worktree", "add", worktreeDir], {
    cwd: repo.value,
    execute: !!worktreeDir,
    onData: () => {
      checkBranches();
      showToast({ title: "Created Worktree" });
      pop();
    },
    onError: (error) => {
      showFailureToast(error, {
        title: `Could not create worktree called ${worktreeName}`,
      });
    },
  });
  const { handleSubmit, itemProps } = useForm<{ newWorktree: string }>({
    onSubmit: (values) => {
      setWorktreeDir(path.join("..", values.newWorktree));
    },
    validation: {
      newWorktree: (value) => {
        const error = validateBranchName(value);
        if (error) {
          return `Worktree name ${error}`;
        }
      },
    },
  });

  return (
    <Form
      navigationTitle="Create New Worktree"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Worktree" onSubmit={handleSubmit} icon={Icon.Checkmark} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="newWorktree"
        title="Worktree name"
        info="Worktree is created next to the current repo directory"
        value={worktreeName}
        onChange={setWorktreeName}
        placeholder="new-worktree"
        autoFocus
        error={itemProps.newWorktree.error}
      />
    </Form>
  );
}
