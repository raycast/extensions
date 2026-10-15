import { Action, ActionPanel, closeMainWindow, Form, Icon, useNavigation } from "@raycast/api";
import { openNewThreadInProject, showFailureToast } from "../lib/open-codex";

function ChooseFolderForm() {
  const { pop } = useNavigation();

  async function onSubmit(values: { folder?: string[] }) {
    const path = values.folder?.[0];
    if (!path) {
      await showFailureToast("No folder selected", "Choose a project folder first.");
      return;
    }
    if (await openNewThreadInProject(path)) {
      pop();
      await closeMainWindow();
    }
  }

  return (
    <Form
      navigationTitle="Choose Another Folder"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="New Thread in Project" icon={Icon.Plus} onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Project Folder"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
      />
    </Form>
  );
}

export default function ChooseFolderAction() {
  return <Action.Push title="Choose Another Folder" icon={Icon.NewFolder} target={<ChooseFolderForm />} />;
}
