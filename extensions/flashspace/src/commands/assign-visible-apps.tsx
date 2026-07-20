import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { getErrorMessage, getFlashspacePath, parseLines, runFlashspaceAsync } from "../utils/cli";

export default function AssignVisibleApps() {
  const flashspace = getFlashspacePath();

  const { data: workspaces } = useExec(flashspace, ["list-workspaces"], {
    parseOutput: ({ stdout }) => parseLines(stdout),
    failureToastOptions: { title: "Failed to list workspaces" },
  });

  async function handleSubmit(values: { workspace: string }) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Assigning visible apps..." });

    try {
      const args = ["assign-visible-apps"];
      if (values.workspace) {
        args.push("--workspace", values.workspace);
      }
      await runFlashspaceAsync(args);
      toast.style = Toast.Style.Success;
      toast.title = "Visible apps assigned";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to assign visible apps";
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Assign Visible Apps" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="workspace" title="Workspace">
        <Form.Dropdown.Item value="" title="Active Workspace" />
        {workspaces?.map((ws) => (
          <Form.Dropdown.Item key={ws} value={ws} title={ws} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
