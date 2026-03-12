import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { createProject } from "./api/mutations";
import { dateOnlyEpochFromLocalDate } from "./helpers/date-codecs";
import { ALL_WORKSPACES_ID, useWorkspaces } from "./hooks/use-workspaces";
import { oauthService } from "./oauth";

interface FormValues {
  name: string;
  key: string;
  description: string;
  targetDate: Date | null;
  workspaceId?: string;
}

function CreateProject() {
  const { workspaces, workspaceId: selectedWorkspaceId, isLoading: isLoadingWorkspace } = useWorkspaces();
  const isAll = selectedWorkspaceId === ALL_WORKSPACES_ID;
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: FormValues) {
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }

    if (!values.key.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Key is required" });
      return;
    }

    const targetWorkspaceId = isAll ? values.workspaceId || workspaces[0]?.id : selectedWorkspaceId;

    if (!targetWorkspaceId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No workspace selected",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createProject(targetWorkspaceId, {
        name: values.name.trim(),
        key: values.key.trim().toUpperCase(),
        description: values.description?.trim() || undefined,
        targetDate: values.targetDate ? dateOnlyEpochFromLocalDate(values.targetDate) : undefined,
      });
      await showToast({ style: Toast.Style.Success, title: "Project created" });
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create project",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} onSubmit={handleSubmit} title="Create Project" />
        </ActionPanel>
      }
      isLoading={isLoadingWorkspace || isSubmitting}
    >
      <Form.TextField autoFocus id="name" placeholder="Project name..." title="Name" />
      <Form.TextField id="key" placeholder="PROJECT" title="Key" />
      <Form.TextArea id="description" placeholder="Project description..." title="Description" />
      <Form.DatePicker id="targetDate" title="Target Date" />
      {isAll && workspaces.length > 1 && (
        <Form.Dropdown defaultValue={workspaces[0]?.id} id="workspaceId" title="Workspace">
          {workspaces.map((w) => (
            <Form.Dropdown.Item key={w.id} title={w.name} value={w.id} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}

export default withAccessToken(oauthService)(CreateProject);
