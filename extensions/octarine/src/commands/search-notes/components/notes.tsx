import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  openCommandPreferences,
  openExtensionPreferences,
} from "@raycast/api";
import type { ReactNode } from "react";
import { openNote } from "@lib/octarine";
import type { IndexedNote } from "@type/notes";
import type { NoteMatch } from "../lib/note-search";
import type { Result as NotePreviewResult } from "../hooks/use-note-preview";
import type { SearchNotesActions, SearchNotesMode } from "../hooks/use-search";
import { NotePreview, NoteSidebarPreview } from "./note-preview";

type NoteResult = {
  note: IndexedNote;
  match?: NoteMatch;
};

type NoteItemProps = {
  result: NoteResult;
  mode: SearchNotesMode;
  actions: SearchNotesActions;
  preview: NotePreviewResult;
};

type ActionPanelProps = {
  mode: SearchNotesMode;
  actions: SearchNotesActions;
  onRefresh: () => void;
  children?: ReactNode;
};

export function NoteItem({ result, mode, actions, preview }: NoteItemProps) {
  const { note, match } = result;
  const selected = note.id === preview.selectedNoteId;
  const accessories: List.Item.Accessory[] = [];
  if (match?.kind === "content") accessories.push({ icon: Icon.Paragraph, tooltip: `Content match · ${note.path}` });
  if (note.pinned) accessories.push({ icon: Icon.Tack, tooltip: "Pinned" });

  return (
    <List.Item
      id={note.id}
      title={note.title}
      subtitle={match?.kind === "content" ? { value: match.excerpt, tooltip: note.path } : note.path}
      keywords={[note.path, note.folder.workspace.name]}
      accessories={accessories}
      detail={preview.isVisible && selected ? <NoteSidebarPreview key={preview.refreshKey} note={note} /> : undefined}
      actions={
        <SearchNotesActionPanel mode={mode} actions={actions} onRefresh={preview.refresh}>
          <Action
            title="Open Note in Octarine"
            icon={Icon.AppWindow}
            onAction={() => void openNote(note.path, note.folder.workspace.name)}
          />
          <Action
            title={preview.isVisible ? "Hide Preview" : "Show Preview"}
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={preview.toggle}
          />
          <Action.Push
            title="Quick Look Note"
            icon={Icon.Eye}
            shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
            target={<NotePreview note={note} />}
          />
        </SearchNotesActionPanel>
      }
    />
  );
}

export function SearchNotesActionPanel({ mode, actions, onRefresh, children }: ActionPanelProps) {
  const pinnedOnly = mode.pinnedOnly;

  return (
    <ActionPanel>
      {children}
      <Action
        title={pinnedOnly ? "Show All Notes" : "Show Pinned Notes Only"}
        icon={pinnedOnly ? Icon.Document : Icon.Tack}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        onAction={actions.togglePinned}
      />
      <Action
        title={mode.contentEnabled ? "Search Titles and Paths Only" : "Search Note Contents"}
        icon={mode.contentEnabled ? Icon.MagnifyingGlass : Icon.Paragraph}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        onAction={actions.toggleContent}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
      <Action title="Open Search Notes Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
    </ActionPanel>
  );
}

export function SearchNotesEmptyActionPanel({ mode, actions, onRefresh }: Omit<ActionPanelProps, "children">) {
  const showAllNotes = mode.pinnedOnly;
  const enableContentSearch = !mode.contentEnabled;
  const refreshIsPrimary = !showAllNotes && !enableContentSearch;
  const searchActions = [
    ...(!showAllNotes
      ? [
          <Action
            key="pinned"
            title="Show Pinned Notes Only"
            icon={Icon.Tack}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={actions.togglePinned}
          />,
        ]
      : []),
    ...(showAllNotes || mode.contentEnabled
      ? [
          <Action
            key="content"
            title={mode.contentEnabled ? "Search Titles and Paths Only" : "Search Note Contents"}
            icon={mode.contentEnabled ? Icon.MagnifyingGlass : Icon.Paragraph}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            onAction={actions.toggleContent}
          />,
        ]
      : []),
  ];
  const emptyActions = [
    showAllNotes ? (
      <Action
        key="show-all"
        title="Show All Notes"
        icon={Icon.Document}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        onAction={actions.togglePinned}
      />
    ) : enableContentSearch ? (
      <Action
        key="content"
        title="Search Note Contents"
        icon={Icon.Paragraph}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        onAction={actions.toggleContent}
      />
    ) : (
      <Action
        key="refresh-primary"
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
    ),
    ...searchActions,
    ...(!refreshIsPrimary
      ? [
          <Action
            key="refresh"
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />,
        ]
      : []),
    <Action
      key="preferences"
      title="Open Search Notes Preferences"
      icon={Icon.Gear}
      onAction={openCommandPreferences}
    />,
  ];

  return <ActionPanel>{emptyActions}</ActionPanel>;
}

export function NoWorkspacesActionPanel({ onRefresh }: Pick<ActionPanelProps, "onRefresh">) {
  return (
    <ActionPanel>
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
    </ActionPanel>
  );
}
