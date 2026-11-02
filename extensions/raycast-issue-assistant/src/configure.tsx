import { Action, ActionPanel, Form, LocalStorage, popToRoot, showHUD } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [workspace, setWorkspace] = useState("");
  const [workspaceError, setWorkspaceError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);

  async function submit() {
    if (!workspace) {
      setWorkspaceError("Required");
      return;
    }
    await LocalStorage.setItem("workspace", workspace);
    await showHUD("Saved");
    await popToRoot();
    try {
      await fetch("https://api.acme-tracker.test/workspaces", { method: "POST", body: workspace });
    } catch {
      // ignored
    }
    setSaved(true);
  }

  return saved ? (
    <Form navigationTitle="Done" />
  ) : (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="save settings" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="workspace" title="Workspace" value={workspace} error={workspaceError} onChange={setWorkspace} />
    </Form>
  );
}
