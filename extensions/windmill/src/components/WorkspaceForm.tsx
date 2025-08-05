import { Form, ActionPanel, Action, useNavigation, Icon, showToast, Toast, Color, Alert } from "@raycast/api";
import { saveWorkspace, removeWorkspace, fetchWorkspaces } from "../hooks/useFetchWorkspaces";
import { WorkspaceConfig } from "../types";
import { confirmAlert } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { validateWorkspace } from "../utils/validateWorkspace";
import { useState } from "react";

async function workspaceExists(workspace: WorkspaceConfig) {
  const workspaces = await fetchWorkspaces();
  return workspaces.some((w) => w.workspaceId === workspace.workspaceId && w.remoteURL === workspace.remoteURL);
}

export function WorkspaceForm({
  workspace: currentWorkspace,
  name,
  onCreate,
  onDelete,
}: {
  workspace?: WorkspaceConfig;
  name?: string;
  onCreate?: () => void;
  onDelete?: () => void;
}) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  let workspaceId = currentWorkspace?.workspaceId;
  let workspaceName = currentWorkspace?.workspaceName;
  const workspaceToken = currentWorkspace?.workspaceToken;
  const remoteURL = currentWorkspace?.remoteURL || "https://app.windmill.dev/";

  if (name) {
    const urlFriendlyName = name ? name.toLowerCase().replace(/\s+/g, "-") : "";
    workspaceName = name;
    workspaceId = urlFriendlyName;
  }

  const { handleSubmit, itemProps, setValidationError } = useForm<WorkspaceConfig>({
    async onSubmit(values) {
      setIsLoading(true);
      const newWorkspace = { ...values };
      if (currentWorkspace?.id) {
        newWorkspace.id = currentWorkspace.id;
      }

      if (!currentWorkspace?.id) {
        if (await workspaceExists(newWorkspace)) {
          setValidationError("workspaceId", "Workspace already exists");
          setIsLoading(false);
          return;
        }
      }

      const isValid = await validateWorkspace(newWorkspace);
      if (isValid !== true) {
        setValidationError(...isValid);
        setIsLoading(false);
        return;
      }
      // if(!await validateWorkspace(newWorkspace)){
      //     // setValidationError('remoteURL', 'Invalid Workspace')
      //     // setValidationError('workspaceId', 'Invalid Workspace')
      //     // setValidationError('workspaceToken', 'Invalid Workspace')
      //     setMainError('Invalid Workspace')
      //     return
      // }

      await saveWorkspace(newWorkspace);
      // Call the onCreate function if it exists
      const title = currentWorkspace ? "Workspace edited" : "Workspace saved";
      await showToast(Toast.Style.Success, title, newWorkspace.workspaceName);
      setIsLoading(false);
      if (onCreate) {
        onCreate();
      }
      // Go back one level
      pop();
    },
    initialValues: {
      remoteURL: remoteURL,
      workspaceId: workspaceId,
      workspaceName: workspaceName,
      workspaceToken: workspaceToken,
    },
    validation: {
      remoteURL: (value) => {
        if (!value) {
          return "The item is required";
        }
        try {
          const url = new URL(value);
          if (url.search || url.hash) {
            return "URL must not have any query or hashes.";
          }
          if (!value.endsWith("/")) {
            return "URL must end with a trailing slash.";
          }
        } catch (_) {
          return "Invalid URL";
        }
      },
      workspaceName: FormValidation.Required,
      workspaceId: FormValidation.Required,
      workspaceToken: FormValidation.Required,
    },
  });

  const handleDelete = async () => {
    if (
      currentWorkspace?.id &&
      (await confirmAlert({
        icon: { source: Icon.Trash, tintColor: Color.Red },
        title: `You are about to remove the "${currentWorkspace?.workspaceName}" workspace from Raycast`,
        primaryAction: {
          title: "Confirm",
          style: Alert.ActionStyle.Destructive,
        },
      }))
    ) {
      setIsLoading(true);
      await removeWorkspace(currentWorkspace?.id);

      await showToast(Toast.Style.Success, "Workspace removed", currentWorkspace.workspaceName);
      if (onDelete) {
        onDelete();
      }
      pop();
    }
    setIsLoading(false);
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Workspace" icon={Icon.Pencil} onSubmit={handleSubmit} />
          {currentWorkspace?.id && (
            <Action
              style={Action.Style.Destructive}
              title="Delete Workspace"
              icon={Icon.Trash}
              onAction={handleDelete}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField title="Workspace Name" placeholder="Displayable name" {...itemProps.workspaceName} />
      <Form.TextField
        title="Workspace Id"
        placeholder="Slug to uniquely identify your workspace"
        {...itemProps.workspaceId}
      />
      <Form.TextField title="Workspace Remote URL" placeholder="https://app.windmill.dev/" {...itemProps.remoteURL} />
      <Form.PasswordField title="Workspace Token" placeholder="xXX...xxx" {...itemProps.workspaceToken} />
    </Form>
  );
}
