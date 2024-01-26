import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
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
  const [defaultParentNoteId, setDefaultParentNoteId] = useState<string>("");

  useEffect(() => {
    async function loadParentNotes() {
      const fetchedData = await fetchParentNotes();
      if (fetchedData) {
        setParentNotes(fetchedData.childNotes);
        setDefaultParentNoteId(fetchedData.mainNotesFolderId);
      }
    }

    loadParentNotes();
  }, []);

  function handleSubmit(values: Values) {
    const trimmedTitle = values.title.trim();
    const trimmedContent = values.content.trim();

    if (!trimmedTitle || !trimmedContent) {
      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: !trimmedTitle ? "Note title is required." : "Note content is required.",
      });
      return;
    }
    addNote({
      title: values.title,
      content: values.content,
      parentNoteId: values.parentNoteId,
    });
    showToast({ title: "Created note", message: values.title });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new note in Trilium." />
      <Form.TextField id="title" title="Note title" placeholder="Enter the note's title" />
      <Form.TextArea id="content" title="Note" placeholder="Enter the note's content" />
      <Form.Dropdown id="parentNoteId" title="Parent Note" defaultValue={defaultParentNoteId}>
        {parentNotes.map((note) => (
          <Form.Dropdown.Item key={note.id} value={note.id} title={note.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
