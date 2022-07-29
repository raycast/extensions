import {
  ActionPanel,
  OpenAction,
  Icon,
  PushAction,
  Color,
  CopyToClipboardAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { HtmlRenderer, Parser } from "commonmark";
import open from "open";
import { Note } from "./bear-db";
import NoteLinks from "./note-links";
import PreviewNote, { formatBearAttachments } from "./preview-note";
import GrabUrl from "./grab-url";
import AddText from "./add-text";
import NewNote from "./new-note";

function renderMarkdown(noteText: string): string {
  const reader = new Parser();
  const writer = new HtmlRenderer();
  let html;
  try {
    const text = formatBearAttachments(noteText, false);
    html = writer.render(reader.parse(text));
    return html;
  } catch (error) {
    console.log(`Error rendering with commonmark: ${String(error)}`);
    showToast(ToastStyle.Failure, "Error rendering markdown");
    return "";
  }
}

function NotePreviewAction({ note }: { note: Note }) {
  return (
    <PushAction
      title="Show Note Preview"
      target={<PreviewNote note={note} />}
      icon={Icon.Text}
      shortcut={{ modifiers: ["cmd"], key: "p" }}
    />
  );
}

export default function NoteActions({ isNotePreview, note }: { isNotePreview: boolean; note: Note }) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Open">
        <OpenAction
          title="Open in Bear"
          target={`bear://x-callback-url/open-note?id=${note.id}&edit=yes`}
          icon={Icon.Sidebar}
        />
        {note.encrypted ? null : (
          <OpenAction
            title="Open in New Bear Window"
            target={`bear://x-callback-url/open-note?id=${note.id}&new_window=yes&edit=yes`}
            icon={Icon.Window}
          />
        )}
      </ActionPanel.Section>
      {note.encrypted ? null : (
        <ActionPanel.Section title="Edit">
          <PushAction
            title="Add Text"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            target={<AddText note={note} />}
          />
          <ActionPanel.Item
            title="Move to Archive"
            onAction={() => {
              open(`bear://x-callback-url/archive?id=${note.id}&show_window=yes`, { background: true });
              showToast(ToastStyle.Success, "Moved note to archive");
            }}
            icon={{ source: Icon.List, tintColor: Color.Orange }}
            shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
          />
          <ActionPanel.Item
            title="Move to Trash"
            onAction={() => {
              open(`bear://x-callback-url/trash?id=${note.id}&show_window=yes`, { background: true });
              showToast(ToastStyle.Success, "Moved note to trash");
            }}
            icon={{ source: Icon.Trash, tintColor: Color.Red }}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
          />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section title="Show in Raycast">
        {isNotePreview ? null : <NotePreviewAction note={note} />}
        <PushAction
          title="Show Note Links"
          target={<NoteLinks note={note} />}
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy">
        {note.encrypted ? null : (
          <CopyToClipboardAction
            title="Copy Markdown"
            content={formatBearAttachments(note.text, false)}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        )}
        {note.encrypted ? null : (
          <CopyToClipboardAction
            title="Copy HTML"
            content={renderMarkdown(note.text)}
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        )}
        <CopyToClipboardAction
          title="Copy Link to Note"
          content={`bear://x-callback-url/open-note?id=${note.id}`}
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
        />
        {note.encrypted ? null : (
          <CopyToClipboardAction
            title="Copy Unique Identifier"
            content={`note.id`}
            icon={Icon.QuestionMark}
            shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "c" }}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Create">
        <PushAction
          title="New Note"
          icon={Icon.Document}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={<NewNote />}
        />
        <PushAction
          title="New Web Capture"
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          target={<GrabUrl />}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
