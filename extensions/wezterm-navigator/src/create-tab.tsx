import { Action, ActionPanel, closeMainWindow, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { useWezTermTabs } from "./hooks/useWezTerm";
import { activatePane, findExistingTab, focusWezTerm, spawnTab, switchWorkspace } from "./utils/wezterm";

interface CreateTabFormProps {
  defaultWorkspace?: string;
}

export function CreateTabForm({ defaultWorkspace }: CreateTabFormProps) {
  const [dirError, setDirError] = useState<string | undefined>();
  const { workspaces, isLoading } = useWezTermTabs();

  const workspaceNames = workspaces.map((ws) => ws.name);

  async function handleSubmit(values: { directory: string[]; workspace: string }) {
    const directory = values.directory?.[0];
    const workspace = values.workspace?.trim() || undefined;

    try {
      if (directory && workspace) {
        const existing = findExistingTab(workspace, directory);
        if (existing) {
          await switchWorkspace(workspace);
          await new Promise((resolve) => setTimeout(resolve, 200));
          await activatePane(existing.pane_id);
          await closeMainWindow({ clearRootSearch: true });
          focusWezTerm();
          await showToast({ style: Toast.Style.Success, title: "Switched to existing tab" });
          return;
        }
      }

      await showToast({ style: Toast.Style.Animated, title: "Creating tab..." });
      const newPaneId = await spawnTab(directory, workspace);
      if (workspace) await switchWorkspace(workspace);
      await activatePane(parseInt(newPaneId, 10));
      await closeMainWindow({ clearRootSearch: true });
      focusWezTerm();
      await showToast({ style: Toast.Style.Success, title: "Tab created" });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create tab",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle="Create WezTerm Tab"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Tab" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="directory"
        title="Working Directory"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        error={dirError}
        onChange={() => setDirError(undefined)}
      />
      <Form.Dropdown
        id="workspace"
        title="Workspace"
        defaultValue={defaultWorkspace ?? ""}
        info="Select a workspace to create the tab in."
      >
        <Form.Dropdown.Item value="" title="Default Workspace" />
        {workspaceNames.map((name) => (
          <Form.Dropdown.Item key={name} value={name} title={name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export default function CreateTab() {
  return <CreateTabForm />;
}
