import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback, useState } from "react";
import { runCueNowCommand } from "./cuenow";
import { Note, displayTitle, loadNotes, matchesSearch } from "./notes-file";

/**
 * CueNow autosaves on a 500ms debounce, so `notes.json` lags a change made through the
 * URL scheme. Rows are updated locally for immediate feedback and the file is re-read
 * after this delay to pick up what the app actually committed.
 */
const AUTOSAVE_SETTLE_MS = 800;

export default function SearchNotes() {
  const { data: notes, isLoading, revalidate, mutate } = usePromise(loadNotes, []);
  const [searchText, setSearchText] = useState("");

  /**
   * Applies a change locally, fires it at the app, then re-reads the file once the
   * autosave has had time to land. On failure the local change is rolled back, so the
   * list never claims something happened that didn't.
   */
  const applyChange = useCallback(
    async (optimistic: (current: Note[] | undefined) => Note[], run: () => Promise<boolean>) => {
      await mutate(
        (async () => {
          const succeeded = await run();
          if (!succeeded) {
            throw new Error("CueNow did not accept the command");
          }
          await new Promise((resolve) => setTimeout(resolve, AUTOSAVE_SETTLE_MS));
          return loadNotes();
        })(),
        { optimisticUpdate: optimistic, rollbackOnError: true, shouldRevalidateAfter: false },
      );
    },
    [mutate],
  );

  const openNote = useCallback(
    (note: Note) => runCueNowCommand("open-note", { params: { id: note.id }, closeWindow: true }),
    [],
  );

  const hideNote = useCallback(
    (note: Note) =>
      applyChange(
        (current) =>
          (current ?? []).map((n) => (n.id === note.id ? { ...n, visibilityState: "minimized" as const } : n)),
        () => runCueNowCommand("hide-note", { params: { id: note.id }, closeWindow: false }),
      ),
    [applyChange],
  );

  const deleteNote = useCallback(
    async (note: Note) => {
      const confirmed = await confirmAlert({
        title: `Delete "${displayTitle(note)}"?`,
        message: "The note is moved to CueNow's trash.",
        icon: Icon.Trash,
        primaryAction: { title: "Delete Note", style: Alert.ActionStyle.Destructive },
      });

      if (!confirmed) {
        return;
      }

      await applyChange(
        (current) => (current ?? []).filter((n) => n.id !== note.id),
        () => runCueNowCommand("delete-note", { params: { id: note.id }, closeWindow: false }),
      );

      await showToast({ style: Toast.Style.Success, title: "Deleted note" });
    },
    [applyChange],
  );

  const copyContent = useCallback(async (note: Note) => {
    const content = note.content.trim();
    if (content.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Note is empty" });
      return;
    }

    await Clipboard.copy(content);
    await showToast({ style: Toast.Style.Success, title: "Copied note content" });
  }, []);

  const matching = (notes ?? []).filter((note) => matchesSearch(note, searchText));
  const active = matching.filter((note) => note.visibilityState === "visible");
  const hidden = matching.filter((note) => note.visibilityState === "minimized");

  const row = (note: Note) => (
    <NoteRow
      key={note.id}
      note={note}
      onOpen={() => openNote(note)}
      onHide={() => hideNote(note)}
      onCopy={() => copyContent(note)}
      onDelete={() => deleteNote(note)}
      onRefresh={revalidate}
    />
  );

  return (
    <List
      isLoading={isLoading}
      // Title-only matching is Raycast's default; searching bodies too needs our own pass.
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search notes by title or content..."
    >
      <List.EmptyView
        icon={Icon.Document}
        title={searchText ? "No matching notes" : "No notes yet"}
        description={
          searchText ? "Nothing matches that title or content." : "Create one with CueNow's Create Note command."
        }
      />
      <List.Section title="Active" subtitle={active.length ? `${active.length}` : undefined}>
        {active.map(row)}
      </List.Section>
      <List.Section title="Hidden" subtitle={hidden.length ? `${hidden.length}` : undefined}>
        {hidden.map(row)}
      </List.Section>
    </List>
  );
}

function NoteRow({
  note,
  onOpen,
  onHide,
  onCopy,
  onDelete,
  onRefresh,
}: {
  note: Note;
  onOpen: () => void;
  onHide: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}) {
  const isActive = note.visibilityState === "visible";

  return (
    <List.Item
      icon={{ source: "command-icon.png" }}
      // No subtitle: a content preview on every row crowds the list. Search still
      // matches note bodies, it just doesn't show them.
      title={displayTitle(note)}
      // Just the date. A visibility badge here would repeat what the Active/Hidden
      // section header already says, and Raycast right-aligns accessories as one block,
      // so the varying date width would leave the badge sitting at a different spot on
      // every row.
      accessories={[{ date: new Date(note.creationDate), tooltip: "Created" }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Open Note" icon={Icon.Window} onAction={onOpen} />
            {/* Hiding an already-hidden note would be a no-op, so don't offer it. */}
            {isActive && (
              <Action
                title="Hide Note"
                icon={Icon.EyeDisabled}
                shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                onAction={onHide}
              />
            )}
            <Action
              title="Copy Content"
              icon={Icon.Clipboard}
              shortcut={Keyboard.Shortcut.Common.Copy}
              onAction={onCopy}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Delete Note"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={onDelete}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
