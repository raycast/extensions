import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import type { MutatePromise } from "@raycast/utils";
import { useState } from "react";

import { Issue, updateIssue } from "../api/issues";
import { getErrorMessage } from "../helpers/errors";

const BRANCH_FIELD_ID = "customfield_12804";

type EditBranchFormProps = {
  issue: Issue;
  mutate?: MutatePromise<Issue[] | undefined>;
};

export default function EditBranchForm({ issue, mutate }: EditBranchFormProps) {
  const { pop } = useNavigation();

  const currentBranch = (issue.fields as unknown as Record<string, unknown>)[BRANCH_FIELD_ID] as
    | string
    | null
    | undefined;

  const [branch, setBranch] = useState(currentBranch ?? "");

  async function submit() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Updating branch" });

      await updateIssue(issue.key, {
        fields: { [BRANCH_FIELD_ID]: branch.trim() || null },
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Branch updated",
        message: `${issue.key} branch set to "${branch.trim()}"`,
      });

      if (mutate) {
        mutate();
      }

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update branch",
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Branch" icon={Icon.Pencil} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="branch"
        title="Branch"
        placeholder="feature/my-branch"
        value={branch}
        onChange={setBranch}
        autoFocus
      />
    </Form>
  );
}
