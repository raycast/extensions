import { Action, ActionPanel, Clipboard, Form, showToast, Toast } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";

import { CommitMessage } from "../types";
import { formatCommitMessage } from "../utils/format-commit-message";

interface GenerateCommitManualProps {
  type: string;
}

export function CommitForm({ type }: GenerateCommitManualProps) {
  const { handleSubmit, itemProps, reset } = useForm<CommitMessage>({
    onSubmit: async ({ body, message, scope, footer, isBreaking }) => {
      try {
        const commitMessage = formatCommitMessage({
          type,
          scope,
          message,
          body,
          footer,
          isBreaking,
        });

        await Clipboard.copy(commitMessage);
        showToast({ style: Toast.Style.Success, title: "Commit Message Copied to Clipboard" });
      } catch (error) {
        showFailureToast({
          title: "Failed to Copy Commit Message",
          message: String(error),
        });
      }
    },
    validation: {
      message: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy Commit Message" onSubmit={handleSubmit} />
          <Action title="Reset Form" onAction={reset} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Scope (Optional)"
        info="What is the scope of this change (e.g. component or filename)"
        placeholder="e.g. auth, payment, UI"
        {...itemProps.scope}
      />

      <Form.TextArea
        title="Commit Message"
        info="Write a short, imperative tense description of this change (max 66ch)"
        placeholder="Short description of the change"
        {...itemProps.message}
      />

      <Form.Checkbox label="Are there any breaking changes?" {...itemProps.isBreaking} />

      <Form.TextArea
        title="Body (Optional)"
        info="Provide a larger description of the change"
        placeholder="Detailed explanation (if needed)"
        {...itemProps.body}
      />

      <Form.TextArea
        title="Footer (Optional)"
        placeholder="Issue references (e.g., Closes #123)"
        {...itemProps.footer}
      />
    </Form>
  );
}
