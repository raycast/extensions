import { Action, ActionPanel, LocalStorage, showToast, Toast, Form } from "@raycast/api";
import { STORAGE_WORKSPACE_SLUG_KEY } from "../helpers/keys";

function WorkspaceSlugForm({
  onWorkspaceSlugSubmit,
  token,
}: {
  onWorkspaceSlugSubmit: (workspaceSlug: string) => void;
  token: string;
}) {
  async function handleSubmit(values: { workspaceSlug: string }) {
    const workspaceSlug = values.workspaceSlug?.trim();

    if (!workspaceSlug) {
      showToast({
        style: Toast.Style.Failure,
        title: "Workspace slug is required",
      });
      return;
    }

    try {
      const tokenKey = STORAGE_WORKSPACE_SLUG_KEY(token);
      await LocalStorage.setItem(tokenKey, workspaceSlug);
      showToast({
        style: Toast.Style.Success,
        title: "Workspace saved",
        message: `Workspace: ${workspaceSlug}`,
      });
      onWorkspaceSlugSubmit(workspaceSlug);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save workspace",
        message: String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Workspace" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter your Plane workspace slug to continue" />
      <Form.TextField
        id="workspaceSlug"
        title="Workspace Slug"
        placeholder="my-workspace"
        info="You can find your workspace slug in your Plane URL: app.plane.so/my-workspace"
      />
    </Form>
  );
}

export default WorkspaceSlugForm;
