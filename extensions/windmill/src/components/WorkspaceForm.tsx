import { Form, ActionPanel, Action, useNavigation, Icon } from "@raycast/api";
import { saveWorkspace, removeWorkspace, fetchWorkspaces } from "../hooks/useFetchWorkspaces";
import { WorkspaceConfig } from "../types";
import { confirmAlert } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import fetch from "node-fetch";

async function validateWorkspace(workspace: WorkspaceConfig): Promise<true | [keyof WorkspaceConfig, string]> {
  try {
    const response = await fetch(`${workspace.remoteURL}api/workspaces/exists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${workspace.workspaceToken}`,
      },
      body: JSON.stringify({ id: workspace.workspaceId }),
    });
    if (response.status === 401) {
      return ["workspaceToken", "Invalid Token"];
    } else if (response.status !== 200) {
      return ["remoteURL", "Invalid URL"];
    } else {
      const textResponse = await response.text();
      console.log("textResponse", textResponse);
      if (textResponse === "true") {
        return true;
      } else {
        return ["workspaceId", "Invalid Workspace"];
      }
    }
  } catch (_) {
    return ["remoteURL", "Invalid URL"];
  }
}

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
      const newWorkspace = { ...values };
      if (currentWorkspace?.id) {
        newWorkspace.id = currentWorkspace.id;
      }

      if (!currentWorkspace?.id) {
        if (await workspaceExists(newWorkspace)) {
          setValidationError("workspaceId", "Workspace already exists");
          return;
        }
      }

      const isValid = await validateWorkspace(newWorkspace);
      if (isValid !== true) {
        setValidationError(...isValid);
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
        title: `You are about to remove the "${currentWorkspace?.workspaceName}" workspace from Raycast`,
      }))
    ) {
      await removeWorkspace(currentWorkspace?.id);
      if (onDelete) {
        onDelete();
      }
      pop();
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Workspace" icon={Icon.Pencil} onSubmit={handleSubmit} />
          {currentWorkspace?.id && <Action title="Delete Workspace" icon={Icon.Trash} onAction={handleDelete} />}
        </ActionPanel>
      }
    >
      <Form.TextField title="Workspace Name" {...itemProps.workspaceName} />
      <Form.TextField title="Workspace Id" {...itemProps.workspaceId} />
      <Form.TextField title="Workspace Remote URL" {...itemProps.remoteURL} />
      <Form.PasswordField title="Workspace Token" {...itemProps.workspaceToken} />
    </Form>
  );
}
