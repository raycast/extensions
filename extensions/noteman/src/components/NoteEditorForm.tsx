import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { appendToFile, readFileUtf8, writeFileUtf8 } from "../lib/fs";
import {
  NoteFile,
  getNoteByPath,
  renameNoteFromTitleIfNeeded,
  syncTitleInMarkdown,
} from "../lib/notes";

type NoteEditFormProps = {
  note: NoteFile;
  onSaved?: (updatedPath: string) => void;
};

type AppendTextFormProps = {
  notePath: string;
  onAppended?: (updatedPath: string) => void;
};

type NoteEditFormFromPathProps = {
  notePath: string;
  onSaved?: (updatedPath: string) => void;
};

function appendSnippet(existing: string, snippet: string): string {
  if (!existing.trim()) {
    return snippet;
  }

  const separator = existing.endsWith("\n") ? "" : "\n";
  return `${existing}${separator}${snippet}`;
}

export function NoteEditForm({ note, onSaved }: NoteEditFormProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const { pop } = useNavigation();

  async function handleSubmit() {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title is required",
      });
      return;
    }

    try {
      const nextContent = syncTitleInMarkdown(content, cleanTitle);
      await writeFileUtf8(note.path, nextContent);
      const updatedPath = await renameNoteFromTitleIfNeeded(
        note.path,
        cleanTitle,
      );

      onSaved?.(updatedPath);
      await showToast({ style: Toast.Style.Success, title: "Note saved" });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save note",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      navigationTitle="Edit Note"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Note"
            icon={Icon.CheckCircle}
            onSubmit={handleSubmit}
          />
          <ActionPanel.Section title="Formatting">
            <Action
              title="Insert Heading"
              icon={Icon.Text}
              shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
              onAction={() =>
                setContent((value) => appendSnippet(value, "\n## Heading\n"))
              }
            />
            <Action
              title="Insert Bold"
              icon={Icon.TextCursor}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
              onAction={() =>
                setContent((value) => appendSnippet(value, "**bold text**"))
              }
            />
            <Action
              title="Insert Italic"
              icon={Icon.Text}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              onAction={() =>
                setContent((value) => appendSnippet(value, "_italic text_"))
              }
            />
            <Action
              title="Insert Inline Code"
              icon={Icon.CodeBlock}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={() =>
                setContent((value) => appendSnippet(value, "`code`"))
              }
            />
            <Action
              title="Insert Link"
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
              onAction={() =>
                setContent((value) =>
                  appendSnippet(value, "[title](https://example.com)"),
                )
              }
            />
            <Action
              title="Insert Bullet List"
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd", "shift"], key: "8" }}
              onAction={() =>
                setContent((value) =>
                  appendSnippet(value, "- item 1\n- item 2"),
                )
              }
            />
            <Action
              title="Insert Numbered List"
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd", "shift"], key: "7" }}
              onAction={() =>
                setContent((value) =>
                  appendSnippet(value, "1. item 1\n2. item 2"),
                )
              }
            />
            <Action
              title="Insert Code Block"
              icon={Icon.Code}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={() =>
                setContent((value) => appendSnippet(value, "```ts\n\n```"))
              }
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        value={title}
        onChange={setTitle}
      />
      <Form.TextArea
        id="content"
        title="Content"
        value={content}
        onChange={setContent}
      />
    </Form>
  );
}

export function NoteEditFormFromPath({
  notePath,
  onSaved,
}: NoteEditFormFromPathProps) {
  const [note, setNote] = useState<NoteFile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadNote() {
      try {
        setErrorMessage(null);
        const loadedNote = await getNoteByPath(notePath);
        setNote(loadedNote);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    }

    loadNote();
  }, [notePath]);

  if (errorMessage) {
    return <Detail markdown={`# Unable to edit note\n\n${errorMessage}`} />;
  }

  if (!note) {
    return <Detail isLoading markdown="Loading note..." />;
  }

  return <NoteEditForm note={note} onSaved={onSaved} />;
}

export function AppendTextForm({ notePath, onAppended }: AppendTextFormProps) {
  const [text, setText] = useState("");
  const { pop } = useNavigation();

  async function handleSubmit() {
    const cleanText = text.trim();
    if (!cleanText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Text is required",
      });
      return;
    }

    try {
      const existing = await readFileUtf8(notePath);
      const separator =
        existing.length === 0 ? "" : existing.endsWith("\n") ? "" : "\n";
      await appendToFile(notePath, `${separator}${cleanText}\n`);

      onAppended?.(notePath);
      await showToast({ style: Toast.Style.Success, title: "Text appended" });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to append text",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      navigationTitle="Append Text"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Append"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="append" title="Text" value={text} onChange={setText} />
    </Form>
  );
}
