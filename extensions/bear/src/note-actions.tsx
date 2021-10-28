import { ActionPanel, OpenAction, Icon, PushAction, Color, CopyToClipboardAction, showToast, ToastStyle } from "@raycast/api";
import { Note } from "./bear-db";
import NoteLinks from "./note-links";
import PreviewNote, { formatBearAttachments } from "./preview-note";
import { HtmlRenderer, Parser } from "commonmark";

function renderMarkdown(noteText: string): string {
  const reader = new Parser();
  const writer = new HtmlRenderer();
  let html;
  try {
    const text = formatBearAttachments(
      noteText,
      false
    );
    html = writer.render(reader.parse(text));
    return html;
  } catch (error) {
    console.log(`Error rendering with commonmark: ${String(error)}`);
    showToast(ToastStyle.Failure, "Error rendering markdown");
    return "";
  }
};

function NotePreviewAction({ note }: { note: Note }) {
  return (<PushAction
    title="Show Note Preview"
    target={<PreviewNote note={note} />}
    icon={Icon.Text}
    shortcut={{ modifiers: ["cmd"], key: "p" }}
  />);
}

export default function NoteActions({ isNotePreview, note }: { isNotePreview: boolean, note: Note}) {
    return (
      <ActionPanel>
        <ActionPanel.Section title="Open">
          <OpenAction
            title="Open in Bear"
            target={`bear://x-callback-url/open-note?id=${note.id}&edit=yes`}
            icon={Icon.Sidebar}
          />
          <OpenAction
            title="Open in New Bear Window"
            target={`bear://x-callback-url/open-note?id=${note.id}&new_window=yes&edit=yes`}
            icon={Icon.Window}
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="Move">
          <OpenAction
            title="Move to Archive"
            target={`bear://x-callback-url/archive?id=${note.id}&show_window=yes`}
            icon={{ source: Icon.List, tintColor: Color.Orange }}
            shortcut={{ modifiers: ["cmd", "shift"], key:"backspace"}}
          />
          <OpenAction
            title="Move to Trash"
            target={`bear://x-callback-url/trash?id=${note.id}&show_window=yes`}
            icon={{ source: Icon.Trash, tintColor: Color.Red }}
            shortcut={{ modifiers: ["cmd"], key:"backspace"}}
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="Show in Raycast">
          { isNotePreview ? null : <NotePreviewAction note={ note }/> }
          <PushAction
            title="Show Note Links"
            target={<NoteLinks note={note} />}
            icon={Icon.Link}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
        </ActionPanel.Section>
        <ActionPanel.Section title="Copy">
          <CopyToClipboardAction
            title="Copy Markdown"
            content={formatBearAttachments(note.text, false)}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <CopyToClipboardAction
            title="Copy HTML"
            content={renderMarkdown(note.text)}
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
}