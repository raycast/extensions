import { Action, ActionPanel, AI, environment, Form, LaunchType, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";

import { CommitMessageResult } from "./components/commit-message-result";
import { createPrompt } from "./utils/create-commit-prompt";

export default function GenerateCommitWithAI() {
  const { push } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{ description: string }>({
    initialValues: { description: "" },
    validation: {
      description: FormValidation.Required,
    },
    onSubmit: async (values) => {
      if (!environment.canAccess(AI)) {
        showToast({
          style: Toast.Style.Failure,
          title: "AI access not available",
          message: "You need Raycast Pro to use AI features",
        });
        return;
      }

      showToast({ style: Toast.Style.Animated, title: "Generating Commit Message..." });

      try {
        const prompt = createPrompt(values.description);

        push(<CommitMessageResult launchType={LaunchType.UserInitiated} arguments={{ prompt }} />);
      } catch (error) {
        showFailureToast({
          title: "Failed to Generate Commit Message",
          message: String(error),
        });
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel title="Generate Commit Message">
          <Action.SubmitForm title="Generate with AI" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Commit Description" placeholder="Describe the changes..." {...itemProps.description} />
    </Form>
  );
}
