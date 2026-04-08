import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { getNotesDirectory } from "../lib/config";
import { appendToFile, readFileUtf8 } from "../lib/fs";
import {
  NoteListItem,
  appendDailyEntry,
  createNewNoteFile,
  listMarkdownFileMetadata,
} from "../lib/notes";
import { NoteDetailView } from "./NoteDetailView";

type CaptureTarget = "daily" | "new" | "append";

type QuickCaptureFormProps = {
  onCaptured?: (path: string) => void;
};

export function QuickCaptureForm({ onCaptured }: QuickCaptureFormProps) {
  const [noteText, setNoteText] = useState("");
  const [target, setTarget] = useState<CaptureTarget>("daily");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const hasShownReadWarning = useRef(false);
  const { push } = useNavigation();

  const appendChoices = useMemo(
    () => notes.map((note) => ({ title: note.title, value: note.path })),
    [notes],
  );

  useEffect(() => {
    async function loadNotes() {
      if (target !== "append") {
        return;
      }

      try {
        setIsLoadingNotes(true);
        const notesDir = getNotesDirectory();
        let skippedFiles = 0;
        const foundNotes = await listMarkdownFileMetadata(notesDir, () => {
          skippedFiles += 1;
        });
        setNotes(foundNotes);
        setSelectedPath((previous) => previous || foundNotes[0]?.path || "");
        if (skippedFiles > 0 && !hasShownReadWarning.current) {
          hasShownReadWarning.current = true;
          await showToast({
            style: Toast.Style.Failure,
            title: `Skipped ${skippedFiles} unreadable note${skippedFiles > 1 ? "s" : ""}`,
          });
        }
      } catch {
        setNotes([]);
      } finally {
        setIsLoadingNotes(false);
      }
    }

    loadNotes();
  }, [target]);

  async function handleSubmit() {
    const cleanText = noteText.trim();
    if (!cleanText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Note text is required",
      });
      return;
    }

    try {
      const notesDir = getNotesDirectory();
      let affectedPath = "";

      if (target === "daily") {
        affectedPath = await appendDailyEntry(notesDir, cleanText);
      } else if (target === "new") {
        const cleanTitle = title.trim();
        if (!cleanTitle) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Title is required for a new note",
          });
          return;
        }

        affectedPath = await createNewNoteFile(notesDir, cleanTitle, cleanText);
      } else {
        if (!selectedPath) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Choose a note to append to",
          });
          return;
        }

        const existingContent = await readFileUtf8(selectedPath);
        const separator =
          existingContent.length === 0
            ? ""
            : existingContent.endsWith("\n")
              ? ""
              : "\n";
        await appendToFile(selectedPath, `${separator}${cleanText}\n`);
        affectedPath = selectedPath;
      }

      onCaptured?.(affectedPath);
      await showToast({ style: Toast.Style.Success, title: "Capture saved" });
      push(
        <NoteDetailView
          notePath={affectedPath}
          onNoteChanged={onCaptured}
          onNoteDeleted={onCaptured}
        />,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to capture note",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      isLoading={isLoadingNotes}
      navigationTitle="Quick Capture"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Capture"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="note"
        title="Note"
        placeholder="Write something quickly..."
        value={noteText}
        onChange={setNoteText}
      />
      <Form.Dropdown
        id="target"
        title="Target"
        value={target}
        onChange={(value) => setTarget(value as CaptureTarget)}
      >
        <Form.Dropdown.Item value="daily" title="Daily Note" />
        <Form.Dropdown.Item value="new" title="New Note" />
        <Form.Dropdown.Item value="append" title="Append to Existing" />
      </Form.Dropdown>

      {target === "new" ? (
        <Form.TextField
          id="title"
          title="Title"
          value={title}
          onChange={setTitle}
        />
      ) : null}

      {target === "append" ? (
        <Form.Dropdown
          id="existing"
          title="Existing Note"
          value={selectedPath}
          onChange={setSelectedPath}
        >
          {appendChoices.length > 0 ? (
            appendChoices.map((choice) => (
              <Form.Dropdown.Item
                key={choice.value}
                value={choice.value}
                title={choice.title}
              />
            ))
          ) : (
            <Form.Dropdown.Item value="" title="No notes found" />
          )}
        </Form.Dropdown>
      ) : null}
    </Form>
  );
}
