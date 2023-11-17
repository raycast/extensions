import { Workspace } from "../types";
import { ActionPanel, Action, Form } from "@raycast/api";

function WorkspaceForm(props: { draftValue?: Workspace; handleSubmit: (workspaces: Workspace) => void }) {
  const { draftValue, handleSubmit } = props;
  console.log("WorkspaceForm", draftValue);
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Workspace" />
        </ActionPanel>
      }
    >
      <Form.TextField defaultValue={draftValue?.title} id="title" title="Workspace Title" placeholder="New Workspace" />
      <Form.Separator />
      <Form.TextField defaultValue={draftValue?.urls} id="urls" title="URLs" placeholder="please separate with ," />
      <Form.FilePicker
        defaultValue={draftValue?.files}
        id="files"
        title="Files or Apps"
        info="Please select your file, folder, App"
        canChooseDirectories
      />
    </Form>
  );
}

export default WorkspaceForm;
