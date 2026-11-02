import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { type ReactNode, useState } from "react";
import { createGitHubIntegration } from "../lib/notra";
import { getErrorMessage } from "../utils";

interface CreateGitHubIntegrationFormProps {
  /** Shown while the standalone command resolves the workspace. */
  isLoading?: boolean;
  onCreated?: () => Promise<void> | void;
  /** Workspace picker for the standalone command; pushed forms use the parent's workspace. */
  workspacePicker?: ReactNode;
}

export function CreateGitHubIntegrationForm({
  isLoading,
  onCreated,
  workspacePicker,
}: CreateGitHubIntegrationFormProps) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { owner: string; repo: string; branch: string }) {
    const owner = values.owner.trim();
    const repo = values.repo.trim();
    if (!(owner && repo)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Owner and repo are required",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating integration...",
    });
    setIsSubmitting(true);

    try {
      await createGitHubIntegration({
        owner,
        repo,
        ...(values.branch.trim() ? { branch: values.branch.trim() } : {}),
      });
      await onCreated?.();
      toast.style = Toast.Style.Success;
      toast.title = "GitHub integration created";
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create integration";
      toast.message = getErrorMessage(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} onSubmit={handleSubmit} title="Create Integration" />
        </ActionPanel>
      }
      isLoading={isLoading || isSubmitting}
      navigationTitle="Create GitHub Integration"
    >
      {workspacePicker}
      <Form.TextField id="owner" placeholder="Organization or username" title="Owner" />
      <Form.TextField id="repo" placeholder="Repository name" title="Repository" />
      <Form.TextField defaultValue="" id="branch" placeholder="Default branch (optional)" title="Branch" />
    </Form>
  );
}
