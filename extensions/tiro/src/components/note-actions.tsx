import { Action, ActionPanel, Clipboard, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getShareUrl, getSummaryMarkdown, getTranscript, Note } from "../lib/api";
import { NoteDetail } from "./note-detail";

/** `current` is the detail view being shown, if any; the other view stays one keystroke away. */
export function NoteActions({ note, current }: { note: Note; current?: "summary" | "transcript" }) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {current !== "summary" && (
          <Action.Push title="Show Summary" icon={Icon.Document} target={<NoteDetail note={note} />} />
        )}
        <Action.OpenInBrowser title="Open in Tiro" url={note.webUrl} />
        {current !== "transcript" && (
          <Action.Push
            title="Show Transcript"
            icon={Icon.Text}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            target={<NoteDetail note={note} view="transcript" />}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Copy Summary"
          icon={Icon.Clipboard}
          shortcut={Keyboard.Shortcut.Common.Copy}
          onAction={() => copy("Summary", () => getSummaryMarkdown(note.guid))}
        />
        <Action
          title="Copy Transcript"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
          onAction={() => copy("Transcript", () => getTranscript(note.guid))}
        />
        <Action
          title="Copy Share Link"
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd", "opt"], key: "l" }}
          onAction={() => copy("Share link", () => getShareUrl(note.guid))}
        />
        <Action.CopyToClipboard
          title="Copy Note Link"
          content={note.webUrl}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

async function copy(label: string, load: () => Promise<string | null>) {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Copying ${label.toLowerCase()}` });
  try {
    const text = await load();
    if (!text) {
      toast.style = Toast.Style.Failure;
      toast.title = label === "Share link" ? "This note hasn't been shared yet" : `No ${label.toLowerCase()} yet`;
      return;
    }
    await Clipboard.copy(text);
    toast.style = Toast.Style.Success;
    toast.title = `${label} copied`;
  } catch (error) {
    await toast.hide();
    await showFailureToast(error, { title: `Couldn't copy ${label.toLowerCase()}` });
  }
}
