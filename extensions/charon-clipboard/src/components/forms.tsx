import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { deleteSnippet, loadFolders, upsertFolder, upsertSnippet } from "../lib/storage";
import type { Snippet, SnippetFolder } from "../lib/types";

const NEW_FOLDER = "__new__";

export function SnippetForm(props: {
  snippet?: Snippet;
  folderId?: string;
  initialContent?: string;
  onSaved?: () => void;
}) {
  const { pop } = useNavigation();
  const [folders] = useState<SnippetFolder[]>(() => loadFolders());
  const [folderId, setFolderId] = useState<string>(props.folderId ?? folders[0]?.id ?? NEW_FOLDER);
  const [titleError, setTitleError] = useState<string>();

  async function submit(values: { title: string; content: string; folderId: string; newFolder?: string }) {
    if (!values.title.trim()) {
      setTitleError("Enter a title");
      return;
    }
    let targetId = values.folderId;
    if (targetId === NEW_FOLDER) {
      const name = values.newFolder?.trim() || "Snippets";
      upsertFolder({ title: name });
      targetId = loadFolders().find((f) => f.title === name)?.id ?? "";
    }
    try {
      if (props.snippet && props.folderId && props.folderId !== targetId) {
        // Moved to another folder
        deleteSnippet(props.folderId, props.snippet.id);
        upsertSnippet(targetId, { title: values.title, content: values.content });
      } else {
        upsertSnippet(targetId, { id: props.snippet?.id, title: values.title, content: values.content });
      }
      await showToast({ style: Toast.Style.Success, title: props.snippet ? "Snippet updated" : "Snippet added" });
      props.onSaved?.();
      pop();
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Could not save the snippet", message: String(e) });
    }
  }

  const defaultContent = props.snippet?.content ?? props.initialContent ?? "";

  return (
    <Form
      navigationTitle={props.snippet ? "Edit Snippet" : "Add Snippet"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Snippet" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="folderId" title="Folder" value={folderId} onChange={setFolderId}>
        {folders.map((f) => (
          <Form.Dropdown.Item key={f.id} value={f.id} title={f.title} />
        ))}
        <Form.Dropdown.Item value={NEW_FOLDER} title="New Folder…" />
      </Form.Dropdown>
      {folderId === NEW_FOLDER ? <Form.TextField id="newFolder" title="Folder Name" placeholder="Snippets" /> : null}
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Greeting"
        defaultValue={props.snippet?.title ?? defaultContent.trim().split("\n")[0]?.slice(0, 40) ?? ""}
        error={titleError}
        onChange={() => setTitleError(undefined)}
      />
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Text to paste"
        defaultValue={defaultContent}
        enableMarkdown={false}
      />
    </Form>
  );
}

export function FolderForm(props: { folder?: SnippetFolder; onSaved?: () => void }) {
  const { pop } = useNavigation();
  const [titleError, setTitleError] = useState<string>();

  async function submit(values: { title: string; enabled: boolean }) {
    if (!values.title.trim()) {
      setTitleError("Enter a folder name");
      return;
    }
    upsertFolder({ id: props.folder?.id, title: values.title.trim(), enabled: values.enabled });
    await showToast({ style: Toast.Style.Success, title: props.folder ? "Folder updated" : "Folder created" });
    props.onSaved?.();
    pop();
  }

  return (
    <Form
      navigationTitle={props.folder ? "Edit Folder" : "New Folder"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Folder" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Name"
        placeholder="Work"
        defaultValue={props.folder?.title}
        error={titleError}
        onChange={() => setTitleError(undefined)}
      />
      <Form.Checkbox
        id="enabled"
        title="Visibility"
        label="Show in menus"
        defaultValue={props.folder?.enabled ?? true}
      />
    </Form>
  );
}
