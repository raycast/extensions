import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  openCommandPreferences,
  openExtensionPreferences,
  Toast,
  showToast,
} from "@raycast/api";
import type { ReactNode } from "react";
import { dailyNoteStem } from "@lib/daily-desk";
import { openNote } from "@lib/octarine";
import type { IndexedNote } from "@type/notes";
import type { DailyDeskSuggestion } from "../hooks/use-search";

type DailyNoteItemProps = {
  note: IndexedNote;
  showFilename: boolean;
  onRefresh: () => void;
  onWorkspaceOpened: (workspaceName: string) => void | Promise<void>;
  onOpenDate?: () => void;
  openDateTitle?: string;
};

type DailyNoteSuggestionProps = {
  suggestion: DailyDeskSuggestion;
  onOpen: (date: string, workspaceName: string) => Promise<void>;
  onChooseWorkspace: (date: string) => void;
  onRefresh: () => void;
  onClear: () => void | Promise<void>;
};

type DailyNoteActionsProps = {
  children?: ReactNode;
  onRefresh: () => void;
  onOpenDate?: () => void;
  openDateTitle?: string;
};

export function DailyNoteItem({
  note,
  showFilename,
  onRefresh,
  onWorkspaceOpened,
  onOpenDate,
  openDateTitle,
}: DailyNoteItemProps) {
  const openExistingNote = async () => {
    try {
      await openNote(note.path, note.folder.workspace.name, () => onWorkspaceOpened(note.folder.workspace.name));
    } catch (error) {
      console.error("Failed to open note", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Open Note",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <List.Item
      title={showFilename ? dailyNoteStem(note.path) : note.title}
      subtitle={showFilename ? note.title : undefined}
      keywords={[note.path, note.title, note.folder.workspace.name]}
      actions={
        <DailyNoteActions onRefresh={onRefresh} onOpenDate={onOpenDate} openDateTitle={openDateTitle}>
          <Action title="Open Note in Octarine" icon={Icon.AppWindow} onAction={() => void openExistingNote()} />
        </DailyNoteActions>
      }
    />
  );
}

export function DailyNoteSuggestion({
  suggestion,
  onOpen,
  onChooseWorkspace,
  onRefresh,
  onClear,
}: DailyNoteSuggestionProps) {
  const { label, date, target, locked } = suggestion;
  const workspaceActions = target ? (
    [
      <Action
        key="open"
        title={`Open in ${target.name}`}
        icon={Icon.AppWindow}
        onAction={() => void onOpen(date, target.name)}
      />,
      ...(!locked
        ? [
            <Action key="choose" title="Choose Workspace…" icon={Icon.List} onAction={() => onChooseWorkspace(date)} />,
            <Action key="clear" title="Clear Last Workspace" icon={Icon.XMarkCircle} onAction={onClear} />,
          ]
        : []),
    ]
  ) : (
    <Action title={`Open ${label}`} icon={Icon.AppWindow} onAction={() => onChooseWorkspace(date)} />
  );

  return (
    <List.Item
      icon={Icon.PlusCircle}
      title={label}
      actions={<DailyNoteActions onRefresh={onRefresh}>{workspaceActions}</DailyNoteActions>}
    />
  );
}

export function DailyNoteActions({ children, onRefresh, onOpenDate, openDateTitle }: DailyNoteActionsProps) {
  return (
    <ActionPanel>
      {children}
      {onOpenDate ? (
        <Action
          title={openDateTitle ?? "Force Open Typed Date"}
          icon={Icon.PlusCircle}
          shortcut={{ modifiers: ["cmd"], key: "return" }}
          onAction={onOpenDate}
        />
      ) : null}
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
      <Action title="Open Daily Desk Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
    </ActionPanel>
  );
}

export function DailyNoteEmptyActionPanel({
  hasWorkspaces,
  onRefresh,
}: {
  hasWorkspaces: boolean;
  onRefresh: () => void;
}) {
  return (
    <ActionPanel>
      {!hasWorkspaces ? (
        <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      ) : null}
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
    </ActionPanel>
  );
}
