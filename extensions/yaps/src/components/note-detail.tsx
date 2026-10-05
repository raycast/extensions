import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  Keyboard,
  open,
  openExtensionPreferences,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { runAction } from "../lib/action";
import { displaySource, previewMarkdown } from "../lib/format";
import { openYapsWithFallback } from "../lib/yaps-app";
import { getNote, resolveVaultFile } from "../lib/yaps-cli";

interface NoteDetailProps {
  path: string;
}

export function NoteDetail({ path }: NoteDetailProps) {
  const {
    data: note,
    error,
    isLoading,
    revalidate,
  } = usePromise(getNote, [path], {
    failureToastOptions: {
      title: "Could not load the note",
    },
  });

  const metadata = note ? (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Location" text={note.path} icon={Icon.Folder} />
      <Detail.Metadata.Label title="Source" text={displaySource(note.source)} />
      <Detail.Metadata.Label title="Updated" text={formatTimestamp(note.updated_at)} />
      <Detail.Metadata.Label title="Privacy" text="Stored locally on this Mac" icon={Icon.Lock} />
      {note.tags.length > 0 ? (
        <Detail.Metadata.TagList title="Tags">
          {note.tags.map((tag) => (
            <Detail.Metadata.TagList.Item key={tag} text={tag} />
          ))}
        </Detail.Metadata.TagList>
      ) : null}
    </Detail.Metadata>
  ) : undefined;

  return (
    <Detail
      isLoading={isLoading && !error}
      navigationTitle={error ? "Could Not Load Note" : (note?.title ?? "Yaps Note")}
      markdown={
        error
          ? "## This note could not be loaded\n\nYaps could not read this note right now. Try again, or return to search and open it again."
          : note
            ? previewMarkdown(note.markdown)
            : ""
      }
      metadata={metadata}
      actions={
        note ? (
          <NoteActions path={note.path} title={note.title} markdown={note.markdown} />
        ) : error ? (
          <ActionPanel>
            <Action
              title="Try Again"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
            <Action
              title="Open Yaps"
              icon={Icon.AppWindow}
              shortcut={Keyboard.Shortcut.Common.Open}
              onAction={() => runAction("Could not open Yaps", openYapsWithFallback)}
            />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

interface NoteActionsProps {
  path: string;
  title: string;
  markdown?: string;
  includeViewAction?: boolean;
}

export function NoteActions({ path, title, markdown, includeViewAction = false }: NoteActionsProps) {
  return (
    <ActionPanel>
      {includeViewAction ? <Action.Push title="View Note" icon={Icon.Eye} target={<NoteDetail path={path} />} /> : null}
      <Action
        title="Open Markdown File"
        icon={Icon.Document}
        onAction={() => runAction("Could not open the note", async () => open(await resolveVaultFile(path)))}
      />
      <Action
        title="Show in Finder"
        icon={Icon.Finder}
        onAction={() => runAction("Could not reveal the note", async () => showInFinder(await resolveVaultFile(path)))}
      />
      <Action.CopyToClipboard title="Copy Wikilink" content={`[[${title}]]`} shortcut={Keyboard.Shortcut.Common.Copy} />
      <Action
        title="Copy Markdown"
        icon={Icon.Clipboard}
        onAction={() =>
          runAction("Could not copy the note", async () => {
            const content = markdown ?? (await getNote(path)).markdown;
            await Clipboard.copy(content);
            await showToast({ style: Toast.Style.Success, title: "Copied note Markdown" });
          })
        }
      />
      <Action
        title="Open Yaps"
        icon={Icon.AppWindow}
        onAction={() => runAction("Could not open Yaps", openYapsWithFallback)}
      />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel>
  );
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}
