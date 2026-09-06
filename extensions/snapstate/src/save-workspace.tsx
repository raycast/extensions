import { Action, ActionPanel, Form, closeMainWindow, showToast, Toast } from "@raycast/api";
import { openSnapState } from "./lib";

export default function SaveWorkspace() {
  async function submit(values: { name: string }) {
    const name = values.name.trim();
    if (!name) {
      await showToast({ style: Toast.Style.Failure, title: "Give the workspace a name" });
      return;
    }

    try {
      await openSnapState("capture", { name });
      await closeMainWindow({ clearRootSearch: true });
      await showToast({ style: Toast.Style.Success, title: `Saving ${name}` });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "SnapState is not available",
        message: "Install or launch SnapState, then try again.",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Workspace" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Workspace Name"
        placeholder="Development, Writing, Meetings…"
        autoFocus
      />
      <Form.Description text="SnapState captures the current windows, apps, displays, and supported browser context locally on your Mac." />
    </Form>
  );
}
