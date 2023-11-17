import { Workspace } from "../types";
import { ActionPanel, Action, Form } from "@raycast/api";
import { useState } from "react";

function WorkspaceForm(props: { draftValue?: Workspace; handleSubmit: (workspaces: Workspace) => void }) {
  const { draftValue, handleSubmit } = props;
  const [id] = useState(draftValue?.id || "");
  const [title, setTitle] = useState(draftValue?.title || "");
  const [urls, setUrls] = useState(draftValue?.urls || "");
  const [files, setFiles] = useState<string[]>(draftValue?.files || []);

  const handleFormSubmit = () => {
    const workspace: Workspace = {
      id,
      title,
      urls,
      files,
    };
    handleSubmit(workspace);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleFormSubmit} title="Save Workspace" />
        </ActionPanel>
      }
    >
      <Form.TextField
        value={title}
        onChange={setTitle}
        id="title"
        title="Workspace Title"
        placeholder="New Workspace"
      />
      <Form.Separator />
      <Form.TextField
        value={urls}
        onChange={setUrls}
        id="urls"
        title="URLs"
        placeholder="please input urls, split by comma (full url with https://)"
        info="https://www.google.com, https://www.raycast.com"
      />
      <Form.FilePicker
        value={files}
        onChange={setFiles}
        id="files"
        title="Files or Apps"
        info="Please select your file, folder, App"
        canChooseDirectories
      />
    </Form>
  );
}

export default WorkspaceForm;
