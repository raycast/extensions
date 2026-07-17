import { useNavigation, showToast, Toast, Form, ActionPanel, Action, Icon } from "@raycast/api";
import { useForm, showFailureToast, FormValidation } from "@raycast/utils";
import { useState, useEffect } from "react";
import useNoteStore from "../stores/note-store";
import { Note, NoteFolder } from "../types";

const ASSIGN_DELAY = 300;

export interface NoteFormValues {
  content: string;
  folder_id: string;
}

export function NoteForm({ note }: { note: Note }) {
  const { pop } = useNavigation();
  const [folderLoading, setFolderLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState(note.content);
  const [folderId, setFolderId] = useState("");
  const folders = useNoteStore((state) => state.folders);
  const { updateNote, fetchFolders } = useNoteStore();

  const { handleSubmit } = useForm<NoteFormValues>({
    async onSubmit(values) {
      try {
        setLoading(true);
        showToast({
          style: Toast.Style.Animated,
          title: "Saving the note...",
        });
        await updateNote({ ...values, id: note.id });
        showToast({
          style: Toast.Style.Success,
          title: "Success!",
          message: "Note saved",
        });
        pop();
      } catch (err: unknown) {
        showFailureToast(err, { title: "Failed to save note, please check your API key, API endpoint and try again." });
      } finally {
        setLoading(false);
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
      setFolderId(note.folder?.id || "");
      setTimeout(() => setFolderId(note.folder?.id || ""), ASSIGN_DELAY);
    } catch (err: unknown) {
      console.error(err);
      showFailureToast(err, { title: "Fetch folders failed, please check your API key, API endpoint and try again." });
    } finally {
      setFolderLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  return (
    <Form
      isLoading={folderLoading || loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextArea enableMarkdown id="content" title="Note" value={content} onChange={(val) => setContent(val)} />
      <Form.Dropdown
        id="folderId"
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
