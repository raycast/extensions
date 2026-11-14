import { Action, ActionPanel, showToast, Toast, Form } from "@raycast/api";
import { normalizeWorkspaceSlug } from "../helpers/urls";

function WorkspaceSlugForm({
  onWorkspaceSlugSubmit,
}: {
  onWorkspaceSlugSubmit: (workspaceSlug: string) => Promise<void>;
}) {
  async function handleSubmit(values: { workspaceSlug: string }) {
    const workspaceSlug = normalizeWorkspaceSlug(values.workspaceSlug);

    if (!workspaceSlug) {
      showToast({
        style: Toast.Style.Failure,
        title: "Workspace slug is required",
      });
      return;
    }

    try {
      await onWorkspaceSlugSubmit(workspaceSlug);
      showToast({
        style: Toast.Style.Success,
        title: "Workspace saved",
        message: `Workspace: ${workspaceSlug}`,
      });
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
        info="You can find your workspace slug in your Plane URL: app.plane.so/my-workspace (you can paste the URL)"
      />
    </Form>
  );
}

export default WorkspaceSlugForm;
