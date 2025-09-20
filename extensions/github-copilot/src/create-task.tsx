import { Action, ActionPanel, Clipboard, Form, Icon, Keyboard, open, popToRoot, showToast, Toast } from "@raycast/api";
import { FormValidation, showFailureToast, useForm, withAccessToken } from "@raycast/utils";
import { useState } from "react";

import { BranchDropdown, RepositoryDropdown } from "./components";
import { useViewer } from "./hooks/useViewer";
import { provider, reauthorize } from "./lib/oauth";
import { createTask } from "./services/copilot";

type FormValues = {
  prompt: string;
  repository: string;
  branch: string;
};

function Command() {
  const [isRepositoryLoading, setIsRepositoryLoading] = useState(false);
  const [isBranchLoading, setIsBranchLoading] = useState(false);
  const [isCreatingTaskLoading, setIsCreatingTaskLoading] = useState(false);

  const { itemProps, handleSubmit } = useForm<FormValues>({
    validation: {
      prompt: FormValidation.Required,
      repository: FormValidation.Required,
      branch: FormValidation.Required,
    },
    onSubmit: async (values) => {
      if (isCreatingTaskLoading) {
        return;
      }

      setIsCreatingTaskLoading(true);
      await showToast({
        style: Toast.Style.Animated,
        title: "Creating task",
      });

      try {
        const { pullRequestUrl } = await createTask(values.repository, values.prompt, values.branch);

        await showToast({
          style: Toast.Style.Success,
          title: "Created task",
          primaryAction: {
            title: "Open in Browser",
            shortcut: Keyboard.Shortcut.Common.Open,
            onAction: () => {
              open(pullRequestUrl);
            },
          },
          secondaryAction: {
            title: "Copy URL",
            shortcut: Keyboard.Shortcut.Common.Copy,
            onAction: async () => {
              await Clipboard.copy(pullRequestUrl);
              await showToast({
                style: Toast.Style.Success,
                title: "Copied URL to Clipboard",
              });
            },
          },
        });

        await popToRoot();
      } catch (error) {
        await showFailureToast(error, { title: "Failed creating task" });
        setIsCreatingTaskLoading(false);
      }
    },
  });
  const { data, isLoading: isViewerLoading } = useViewer();

  // Combine all loading states
  const isLoading = isViewerLoading || isRepositoryLoading || isBranchLoading || isCreatingTaskLoading;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" icon={Icon.NewDocument} onSubmit={handleSubmit} />
          <Action title="Log out" icon={Icon.Logout} onAction={reauthorize} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextArea title="Prompt" placeholder="Describe a coding task to work on" {...itemProps.prompt} />
      <RepositoryDropdown
        organizations={data?.organizations.nodes.map((org) => org.login)}
        itemProps={itemProps.repository}
        onLoadingChange={setIsRepositoryLoading}
      />
      <BranchDropdown
        repository={itemProps.repository.value}
        itemProps={itemProps.branch}
        onLoadingChange={setIsBranchLoading}
      />
    </Form>
  );
}

export default withAccessToken(provider)(Command);
