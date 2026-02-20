import { Action, ActionPanel, Form, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";

import { createLinearClient, linear } from "./api/linearClient";
import { addWorkspace } from "./api/workspaces";

function AddWorkspaceForm() {
  async function handleSubmit(values: { pat: string }) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Validating token..." });

    try {
      const client = createLinearClient(values.pat, "pat");
      const org = await client.organization;

      await addWorkspace({
        id: org.id,
        name: org.name,
        urlKey: org.urlKey,
        logoUrl: org.logoUrl ?? undefined,
        type: "pat",
        pat: values.pat,
      });

      toast.style = Toast.Style.Success;
      toast.title = `Added workspace: ${org.name}`;
      await launchCommand({ name: "switch-workspace", type: LaunchType.UserInitiated });
    } catch (error) {
      console.error("Add workspace error:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Invalid token";
      toast.message =
        error instanceof Error
          ? error.message
          : "Could not authenticate with this token. Make sure it's a valid Personal Access Token.";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Workspace" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Step 1"
        text="In the Linear app, switch to the workspace you want to add using the top-left dropdown."
      />
      <Form.Description title="Step 2" text="Go to Settings → Security & Access → Personal API Keys." />
      <Form.Description
        title="Step 3"
        text="Create a new key (e.g. 'raycast-workspace'), copy it, and paste it below."
      />
      <Form.PasswordField id="pat" title="Personal Access Token" placeholder="lin_api_..." />
      <Form.Description title="Then" text="Use the 'Switch Workspace' command to switch between your workspaces." />
    </Form>
  );
}

export default withAccessToken(linear)(AddWorkspaceForm);
