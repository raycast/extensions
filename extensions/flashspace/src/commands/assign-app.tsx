import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { getErrorMessage, getFlashspacePath, parseLines, parseRunningApps, runFlashspaceAsync } from "../utils/cli";

export default function AssignApp() {
  const flashspace = getFlashspacePath();

  const { data: workspaces } = useExec(flashspace, ["list-workspaces"], {
    parseOutput: ({ stdout }) => parseLines(stdout),
    failureToastOptions: { title: "Failed to list workspaces" },
  });

  const { data: runningApps } = useExec(flashspace, ["list-running-apps", "--with-bundle-id"], {
    parseOutput: ({ stdout }) => parseRunningApps(stdout),
    failureToastOptions: { title: "Failed to list running apps" },
  });

  async function handleSubmit(values: { app: string; workspace: string }) {
    if (!values.app || !values.workspace) {
      await showToast({ style: Toast.Style.Failure, title: "App and workspace are required" });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Assigning app..." });

    try {
      await runFlashspaceAsync(["assign-app", "--name", values.app, "--workspace", values.workspace]);
      toast.style = Toast.Style.Success;
      toast.title = `App assigned to "${values.workspace}"`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to assign app";
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Assign App" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="app" title="App">
        {runningApps?.map((app) => (
          <Form.Dropdown.Item key={app.bundleId || app.name} value={app.bundleId || app.name} title={app.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="workspace" title="Workspace">
        {workspaces?.map((ws) => (
          <Form.Dropdown.Item key={ws} value={ws} title={ws} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
