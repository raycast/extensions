import { useState } from "react";
import { Action, ActionPanel, Form, Icon, showToast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useExec, useForm } from "@raycast/utils";
import { useRepoStorage } from "../../hooks/useRepo.js";

interface Props {
  checkStatus: () => void;
}

export function GitCommit({ checkStatus }: Props) {
  const repo = useRepoStorage();
  const { pop } = useNavigation();
  const [commitMsg, setCommitMsg] = useState("");
  const { revalidate } = useExec("git", ["commit", "-m", commitMsg], {
    cwd: repo.value,
    execute: false,
    onData: () => {
      checkStatus();
      showToast({ title: "Committed changed" });
      pop();
    },
    onError: (error) => {
      showFailureToast(error, { title: "Could not commit changes" });
    },
  });
  const { handleSubmit, itemProps } = useForm({
    onSubmit: revalidate,
    validation: {
      commitMsg: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle="Commit Staged Changes"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Commit" onSubmit={handleSubmit} icon={Icon.Checkmark} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="commitMsg"
        title="Commit message"
        value={commitMsg}
        onChange={setCommitMsg}
        error={itemProps.commitMsg.error}
      />
    </Form>
  );
}
