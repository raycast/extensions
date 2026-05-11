import { Form, ActionPanel, Action, showToast, Toast, LaunchProps, useNavigation, Icon } from "@raycast/api";
import useNoteStore from "./stores/note-store";
import { useState, useEffect } from "react";
import { useForm, FormValidation, showFailureToast } from "@raycast/utils";
import { NoteFolder } from "./types";
import { NoteDetail } from "./components/note-detail";

type Values = {
  content: string;
  folderId: string | null;
};

export default function Command(props: LaunchProps<{ draftValues: Values }>) {
  const { draftValues } = props;
  const folders = useNoteStore((state) => state.folders);
  const [loading, setLoading] = useState(false);
  const [folderLoading, setFolderLoading] = useState(false);
  const { fetchFolders, createNote } = useNoteStore();
  const { push } = useNavigation();

  const loadFolders = async () => {
    try {
      setFolderLoading(true);
      await fetchFolders({ maxAge: 10 * 60 * 1000 }); // Cache for 10 minutes
    } catch (err: unknown) {
      showFailureToast(err, { title: "Fetch folders failed, please check your API key, API endpoint and try again." });
    } finally {
      setFolderLoading(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  const { handleSubmit } = useForm<Values>({
    async onSubmit(values: Values) {
      try {
        setLoading(true);
        showToast({
          style: Toast.Style.Animated,
          title: "Saving the note...",
        });
        const note = await createNote(values);
        showToast({
          style: Toast.Style.Success,
          title: "Success!",
          message: "Note saved",
        });
        push(<NoteDetail note={note} />);
      } catch (err: unknown) {
        showFailureToast(err, {
          title: "Failed to create note, please check your API key, API endpoint and try again.",
        });
      } finally {
        setLoading(false);
      }
    },
    validation: {
      content: FormValidation.Required,
    },
  });

  return (
    <Form
      enableDrafts
      isLoading={folderLoading || loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} icon={Icon.Check} />
          <Action.OpenInBrowser
            icon={Icon.Globe}
            title="Write in Browser"
            url={`https://www.essay.ink/i/notes/compose`}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea enableMarkdown id="content" title="Note" defaultValue={draftValues?.content} />
      <Form.Dropdown id="folderId" title="Folder" defaultValue={draftValues?.folderId || ""}>
        {folders.map((folder: NoteFolder) => {
          return <Form.Dropdown.Item key={folder.id} value={folder.id} title={folder.name} />;
        })}
        <Form.Dropdown.Item value="" title="Uncategorized" />
      </Form.Dropdown>
    </Form>
  );
}
