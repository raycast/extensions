import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import tepi, { APIError } from "trilium-etapi";

type Values = {
  title: string;
  content: string;
  parentNoteId: string;
};

interface ParentNotesResponse {
  mainNotesFolderId: string;
  childNotes: NoteAttributes[];
}

interface NoteAttributes {
  id: string;
  title: string;
}

function setupTepiApi() {
  try {
    const preferences = getPreferenceValues<Preferences>();
    if (!preferences.triliumApiKey) {
      throw new Error("Trilium API key is not set in preferences.");
    }
    tepi.server(preferences.triliumServerUrl).token(preferences.triliumApiKey);
  } catch (error) {
    console.error("Error setting up Trilium API:", error);
    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "Failed to setup Trilium API. Check your API key and preferences.",
    });
  }
}

async function fetchParentNotes(): Promise<ParentNotesResponse> {
  setupTepiApi();

  try {
    const root = await tepi.getNoteById("root");
    const mainNotesFolderId = root.childNoteIds[0];
    const mainNotesFolder = await tepi.getNoteById(mainNotesFolderId);
    const childNotes = await Promise.all(mainNotesFolder.childNoteIds.map((id) => tepi.getNoteById(id)));

    return {
      mainNotesFolderId: mainNotesFolderId,
      childNotes: [
        { id: mainNotesFolderId, title: mainNotesFolder.title },
        ...childNotes.map((note) => ({ id: note.noteId, title: note.title })),
      ],
    };
  } catch (error) {
    if (error instanceof APIError && error) {
      console.error("API Error:", error);
      console.error("Response Status:", error.status);
    } else {
      console.error("Unknown Error:", error);
    }
    return { mainNotesFolderId: "", childNotes: [] };
  }
}

async function addNote(attrs: Values) {
  setupTepiApi();

  const createNote = tepi.createNote({
    parentNoteId: attrs.parentNoteId,
    type: "text",
    title: attrs.title,
    content: attrs.content,
  });

  await createNote;
}

export default function Command() {
  const [parentNotes, setParentNotes] = useState<NoteAttributes[]>([]);

  const { handleSubmit, itemProps, setValue, reset } = useForm<Values>({
    initialValues: {
      title: "",
      content: "",
      parentNoteId: "",
    },
    onSubmit: async (values) => {
      await addNote(values);
      showToast({ title: "Note Created", message: `Title: ${values.title}` });
      reset();
    },
    validation: {
      title: (value) => (!value?.trim() ? "Note title is required." : undefined),
      content: (value) => (!value?.trim() ? "Note content is required." : undefined),
      parentNoteId: (value) => (!value ? "Parent note is required." : undefined),
    },
  });

  useEffect(() => {
    async function loadParentNotes() {
      const fetchedData = await fetchParentNotes();
      if (fetchedData) {
        setParentNotes(fetchedData.childNotes);
        setValue("parentNoteId", fetchedData.mainNotesFolderId);
      }
    }

    loadParentNotes();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new note in Trilium." />
      <Form.TextField {...itemProps.title} title="Note Title" placeholder="Enter the note's title" />
      <Form.TextArea {...itemProps.content} title="Note Content" placeholder="Enter the note's content" />
      <Form.Dropdown {...itemProps.parentNoteId} title="Parent Note">
        {parentNotes.map((note) => (
          <Form.Dropdown.Item key={note.id} value={note.id} title={note.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
