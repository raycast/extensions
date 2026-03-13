import { useState } from "react";
import { Action, ActionPanel, Form, Icon, showToast, useNavigation } from "@raycast/api";
import { showFailureToast, useExec, useForm } from "@raycast/utils";
import { useRepoStorage } from "../../hooks/useRepo.js";
import { validateBranchName } from "../../utils/validators.js";

interface Props {
  checkBranches: () => void;
}

export function CreateBranch({ checkBranches }: Props) {
  const repo = useRepoStorage();
  const { pop } = useNavigation();
  const [branchName, setBranchName] = useState("");
  const { revalidate, isLoading } = useExec("git", ["switch", "-c", branchName], {
    cwd: repo.value,
    execute: false,
    onData: () => {
      checkBranches();
      showToast({ title: "Created branch" });
      pop();
    },
    onError: (error) => {
      showFailureToast(error, {
        title: `Could not create a branch called ${branchName}`,
      });
    },
  });
  const { handleSubmit, itemProps } = useForm({
    onSubmit: revalidate,
    validation: {
      newBranch: (value) => {
        const error = validateBranchName(value);
        if (error) {
          return `Branch name ${error}`;
        }
        return undefined;
      },
    },
  });

  return (
    <Form
      navigationTitle="Create New Branch"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Branch" onSubmit={handleSubmit} icon={Icon.Checkmark} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="newBranch"
        title="Branch name"
        info="Do not include any whitespace characters"
        value={branchName}
        onChange={setBranchName}
        placeholder="new-feature-branch"
        autoFocus
        error={itemProps.newBranch.error}
      />
    </Form>
  );
}
