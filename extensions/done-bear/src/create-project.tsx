import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useForm, withAccessToken } from "@raycast/utils";
import { useEffect, useState } from "react";
import { createProject } from "./api/mutations";
import { dateOnlyEpochFromLocalDate } from "./helpers/date-codecs";
import { ALL_WORKSPACES_ID, useWorkspaces } from "./hooks/use-workspaces";
import { oauthService } from "./oauth";

interface FormValues {
  name: string;
  key: string;
  description: string;
  targetDate: Date | null;
  workspaceId: string;
}

function CreateProject() {
  const { workspaces, workspaceId: selectedWorkspaceId, isLoading: isLoadingWorkspace } = useWorkspaces();
  const isAll = selectedWorkspaceId === ALL_WORKSPACES_ID;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    initialValues: {
      name: "",
      key: "",
      description: "",
      targetDate: null,
      workspaceId: "",
    },
    validation: {
      name: (value) => (!value?.trim() ? "Name is required" : undefined),
      key: (value) => (!value?.trim() ? "Key is required" : undefined),
      workspaceId: (value) => {
        if (isAll && workspaces.length > 1 && !value?.trim()) {
          return "Workspace is required";
        }
        return undefined;
      },
    },
    async onSubmit(values) {
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
    },
  });

  useEffect(() => {
    if (!isAll || !workspaces[0]?.id) {
      return;
    }
    setValue("workspaceId", (current) => current || workspaces[0]!.id);
  }, [isAll, workspaces, setValue]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} onSubmit={handleSubmit} title="Create Project" />
        </ActionPanel>
      }
      isLoading={isLoadingWorkspace || isSubmitting}
    >
      <Form.TextField autoFocus placeholder="Project name..." title="Name" {...itemProps.name} />
      <Form.TextField placeholder="PROJECT" title="Key" {...itemProps.key} />
      <Form.TextArea placeholder="Project description..." title="Description" {...itemProps.description} />
      <Form.DatePicker title="Target Date" {...itemProps.targetDate} />
      {isAll && workspaces.length > 1 && (
        <Form.Dropdown title="Workspace" {...itemProps.workspaceId}>
          {workspaces.map((w) => (
            <Form.Dropdown.Item key={w.id} title={w.name} value={w.id} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}

export default withAccessToken(oauthService)(CreateProject);
