import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { getCurrentAccessToken, isApiKeyAuth, planeClient, selectWorkspace } from "../api/auth";
import { useInstallations } from "../hooks/useInstallations";
import { normalizeWorkspaceSlug } from "../helpers/urls";
import { getErrorMsg } from "../helpers/errors";

/**
 * API key users type a slug (there is no "list my workspaces" endpoint).
 * OAuth users pick one of the workspaces that installed the Raycast app.
 */
export default function ChangeWorkspaceForm() {
  return isApiKeyAuth() ? <ApiKeyWorkspaceForm /> : <OAuthWorkspaceForm />;
}

async function submitWorkspace(value: string) {
  const workspaceSlug = normalizeWorkspaceSlug(value);
  if (!workspaceSlug) {
    await showToast({ style: Toast.Style.Failure, title: "Workspace slug is required" });
    return;
  }
  try {
    await selectWorkspace(workspaceSlug);
    await showToast({ style: Toast.Style.Success, title: "Workspace changed", message: workspaceSlug });
    await popToRoot();
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to change workspace", message: getErrorMsg(error) });
  }
}

function ApiKeyWorkspaceForm() {
  const [error, setError] = useState<string | undefined>();
  return (
    <Form
      navigationTitle="Change Workspace"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Workspace"
            icon={Icon.Check}
            onSubmit={(values: { workspaceSlug: string }) => submitWorkspace(values.workspaceSlug)}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Current workspace: ${planeClient?.workspaceSlug ?? "none"}`} />
      <Form.TextField
        id="workspaceSlug"
        title="Workspace Slug"
        placeholder="my-workspace"
        defaultValue={planeClient?.workspaceSlug}
        error={error}
        onChange={() => setError(undefined)}
        onBlur={(event) => setError(normalizeWorkspaceSlug(event.target.value) ? undefined : "Required")}
        info="The part after the host in your Plane URL, e.g. plane.example.com/my-workspace. You can paste the URL."
      />
    </Form>
  );
}

function OAuthWorkspaceForm() {
  const { data: installations, isLoading, error } = useInstallations(getCurrentAccessToken());
  return (
    <Form
      navigationTitle="Change Workspace"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Switch Workspace"
            icon={Icon.Check}
            onSubmit={(values: { workspaceSlug: string }) => submitWorkspace(values.workspaceSlug)}
          />
        </ActionPanel>
      }
    >
      {error ? <Form.Description title="Error" text={getErrorMsg(error)} /> : null}
      <Form.Dropdown id="workspaceSlug" title="Workspace" defaultValue={planeClient?.workspaceSlug}>
        {(installations ?? []).map((installation) => (
          <Form.Dropdown.Item
            key={installation.id}
            value={installation.workspace_detail.slug}
            title={installation.workspace_detail.name}
            icon={installation.workspace_detail.logo_url || Icon.House}
          />
        ))}
      </Form.Dropdown>
      <Form.Description text="Only workspaces where the Raycast app is installed are listed." />
    </Form>
  );
}
