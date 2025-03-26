import { useNavigation, showToast, Toast, Form, ActionPanel, Action } from "@raycast/api";
import { useForm, showFailureToast, FormValidation } from "@raycast/utils";
import { useState, useEffect } from "react";
import useNoteStore from "../stores/note-store";
import { Note, NoteFolder } from "../types";

export interface NoteFormValues {
  content: string;
  folder_id: string;
}

export function NoteForm({ note }: { note: Note }) {
  const { pop } = useNavigation();
  const [folderLoading, setFolderLoading] = useState(true);
  const [content, setContent] = useState(note.content);
  const [folderId, setFolderId] = useState("");
  const folders = useNoteStore((state) => state.folders);
  const { updateNote, fetchFolders } = useNoteStore();

  const { handleSubmit } = useForm<NoteFormValues>({
    async onSubmit(values) {
      try {
        await updateNote({ ...values, id: note.id });
        showToast({
          style: Toast.Style.Success,
          title: "Success!",
          message: "Note saved",
        });
        pop();
      } catch (err: unknown) {
        showFailureToast(err, { title: "Fail to save note, please check your API key and try again." });
      }
    },
    validation: {
      content: FormValidation.Required,
    },
  });

  const loadFolders = async () => {
    try {
      setFolderLoading(true);
      await fetchFolders({ maxAge: 10 * 60 * 1000 }); // Cache for 10 minutes
    } catch (err: unknown) {
      showFailureToast(err, { title: "Fetch folders failed, please check your API key and try again." });
    } finally {
      setFolderLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
    setContent(note.content);
    return () => {
      setContent("");
    };
  }, [note.content]);

  useEffect(() => {
    setTimeout(() => setFolderId(note.folder?.id || ""), 300);
    return () => {
      setFolderId("");
    };
  }, [note.folder?.id, folders]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea enableMarkdown id="content" title="Note" value={content} onChange={(val) => setContent(val)} />
      <Form.Dropdown
        id="folderId"
        isLoading={folderLoading}
        title="Folder"
        value={folderId}
        onChange={(val) => {
          setFolderId(val);
        }}
      >
        {folders.map((folder: NoteFolder) => {
          return <Form.Dropdown.Item key={folder.id} value={folder.id} title={folder.name} />;
        })}
        <Form.Dropdown.Item value="" title="Uncategorized" />
      </Form.Dropdown>
    </Form>
  );
}
