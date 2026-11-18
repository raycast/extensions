import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { codeBlock, firstLine } from "./components/common";
import { FolderForm, SnippetForm } from "./components/forms";
import { exportSnippets, ImportForm } from "./components/ImportExportForm";
import { deleteFolder, deleteSnippet, loadFolders, moveFolder, moveSnippet, upsertFolder } from "./lib/storage";
import type { Snippet, SnippetFolder } from "./lib/types";

/**
 * Clipy's snippet editor in one screen: each folder is a section, every operation is an action
 * on the selected row (⌘K shows them all).
 */
export default function Command() {
  const [folders, setFolders] = useState<SnippetFolder[]>(() => loadFolders());
  const reload = () => setFolders(loadFolders());

  const globalActions = (
    <ActionPanel.Section title="All Snippets">
      <Action.Push
        title="New Folder"
        icon={Icon.NewFolder}
        shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        target={<FolderForm onSaved={reload} />}
      />
      <Action.Push
        title="Import Clipy XML"
        icon={Icon.Download}
        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
        target={<ImportForm onDone={reload} />}
      />
      <Action
        title="Export Clipy XML"
        icon={Icon.Upload}
        shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
        onAction={exportSnippets}
      />
    </ActionPanel.Section>
  );

  const folderActions = (folder: SnippetFolder, idx: number) => (
    <ActionPanel.Section title={`Folder: ${folder.title}`}>
      <Action.Push
        title="Rename Folder"
        icon={Icon.Pencil}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        target={<FolderForm folder={folder} onSaved={reload} />}
      />
      <Action
        title={folder.enabled ? "Hide Folder from Menus" : "Show Folder in Menus"}
        icon={folder.enabled ? Icon.EyeDisabled : Icon.Eye}
        shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
        onAction={() => {
          upsertFolder({ ...folder, enabled: !folder.enabled });
          reload();
        }}
      />
      {idx > 0 ? (
        <Action
          title="Move Folder Upward"
          icon={Icon.ArrowUp}
          shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "arrowUp" }}
          onAction={() => {
            moveFolder(folder.id, -1);
            reload();
          }}
        />
      ) : null}
      {idx < folders.length - 1 ? (
        <Action
          title="Move Folder Downward"
          icon={Icon.ArrowDown}
          shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "arrowDown" }}
          onAction={() => {
            moveFolder(folder.id, 1);
            reload();
          }}
        />
      ) : null}
      <Action
        title="Delete Folder"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
        onAction={async () => {
          const ok = await confirmAlert({
            title: `Delete "${folder.title}"?`,
            message: `Its ${folder.snippets.length} snippet(s) will be deleted too.`,
            primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
          });
          if (!ok) return;
          deleteFolder(folder.id);
          reload();
          await showToast({ style: Toast.Style.Success, title: "Folder deleted" });
        }}
      />
    </ActionPanel.Section>
  );

  const snippetRow = (folder: SnippetFolder, folderIdx: number, s: Snippet, idx: number) => (
    <List.Item
      key={s.id}
      icon={Icon.Snippets}
      title={s.title}
      keywords={[firstLine(s.content), folder.title]}
      detail={<List.Item.Detail markdown={codeBlock(s.content)} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={`Snippet: ${s.title}`}>
            <Action.Push
              title="Edit Snippet"
              icon={Icon.Pencil}
              target={<SnippetForm snippet={s} folderId={folder.id} onSaved={reload} />}
            />
            <Action.Push
              title="New Snippet"
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
              target={<SnippetForm folderId={folder.id} onSaved={reload} />}
            />
            {idx > 0 ? (
              <Action
                title="Move Snippet Upward"
                icon={Icon.ArrowUp}
                shortcut={Keyboard.Shortcut.Common.MoveUp}
                onAction={() => {
                  moveSnippet(folder.id, s.id, -1);
                  reload();
                }}
              />
            ) : null}
            {idx < folder.snippets.length - 1 ? (
              <Action
                title="Move Snippet Downward"
                icon={Icon.ArrowDown}
                shortcut={Keyboard.Shortcut.Common.MoveDown}
                onAction={() => {
                  moveSnippet(folder.id, s.id, 1);
                  reload();
                }}
              />
            ) : null}
            <Action
              title="Delete Snippet"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={async () => {
                const ok = await confirmAlert({
                  title: `Delete "${s.title}"?`,
                  primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                });
                if (!ok) return;
                deleteSnippet(folder.id, s.id);
                reload();
              }}
            />
          </ActionPanel.Section>
          {folderActions(folder, folderIdx)}
          {globalActions}
        </ActionPanel>
      }
    />
  );

  return (
    <List isShowingDetail={folders.some((f) => f.snippets.length > 0)} searchBarPlaceholder="Search snippets">
      <List.EmptyView
        icon={Icon.Snippets}
        title="No Snippets Yet"
        description="Press ⌘⇧N to create a folder, or ⌘⇧I to import your Clipy snippets."
        actions={<ActionPanel>{globalActions}</ActionPanel>}
      />
      {folders.map((folder, fi) => (
        <List.Section
          key={folder.id}
          title={folder.title}
          subtitle={folder.enabled ? `${folder.snippets.length}` : `${folder.snippets.length} · hidden`}
        >
          {folder.snippets.length === 0 ? (
            <List.Item
              key={`${folder.id}-empty`}
              icon={Icon.Plus}
              title="Add a Snippet…"
              detail={<List.Item.Detail markdown="This folder is empty." />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title={`Folder: ${folder.title}`}>
                    <Action.Push
                      title="New Snippet"
                      icon={Icon.Plus}
                      target={<SnippetForm folderId={folder.id} onSaved={reload} />}
                    />
                  </ActionPanel.Section>
                  {folderActions(folder, fi)}
                  {globalActions}
                </ActionPanel>
              }
            />
          ) : (
            folder.snippets.map((s, i) => snippetRow(folder, fi, s, i))
          )}
        </List.Section>
      ))}
    </List>
  );
}
