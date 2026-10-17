import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { getErrorMessage, getFlashspacePath, parseLines, runFlashspaceAsync } from "../utils/cli";

interface UpdateWorkspaceValues {
  workspace: string;
  display: string;
  openApps: string;
}

export default function UpdateWorkspace() {
  const flashspace = getFlashspacePath();
  const { pop } = useNavigation();

  const { data: workspaces } = useExec(flashspace, ["list-workspaces"], {
    parseOutput: ({ stdout }) => parseLines(stdout),
    failureToastOptions: { title: "Failed to list workspaces" },
  });

  const { data: displays } = useExec(flashspace, ["list-displays"], {
    parseOutput: ({ stdout }) => parseLines(stdout),
    failureToastOptions: { title: "Failed to list displays" },
  });

  async function handleSubmit(values: UpdateWorkspaceValues) {
    if (!values.workspace || !values.display || !values.openApps) {
      await showToast({ style: Toast.Style.Failure, title: "Workspace, display, and open apps are required" });
      return;
    }

    const args = ["update-workspace", "--workspace", values.workspace];

    args.push("--display", values.display);
    args.push("--open-apps", values.openApps);

    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating workspace..." });

    try {
      await runFlashspaceAsync(args);
      toast.style = Toast.Style.Success;
      toast.title = `Workspace "${values.workspace}" updated`;
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update workspace";
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Workspace" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="workspace" title="Workspace">
        {workspaces?.map((ws) => (
          <Form.Dropdown.Item key={ws} value={ws} title={ws} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="display" title="Display">
        {displays?.map((d) => (
          <Form.Dropdown.Item key={d} value={d} title={d} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="openApps" title="Open Apps on Activation">
        <Form.Dropdown.Item value="true" title="Yes" />
        <Form.Dropdown.Item value="false" title="No" />
      </Form.Dropdown>
    </Form>
  );
}
