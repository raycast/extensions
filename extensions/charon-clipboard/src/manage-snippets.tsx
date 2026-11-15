import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { codeBlock, firstLine, PasteOrCopyActions } from "./components/common";
import { FolderForm, SnippetForm } from "./components/forms";
import ImportExport from "./import-export-snippets";
import { deleteFolder, deleteSnippet, loadFolders, moveFolder, moveSnippet, upsertFolder } from "./lib/storage";
import type { SnippetFolder } from "./lib/types";

export default function Command() {
  const [folders, setFolders] = useState<SnippetFolder[]>(() => loadFolders());
  const reload = () => setFolders(loadFolders());

  const newFolderAction = (
    <Action.Push
      title="New Folder"
      icon={Icon.NewFolder}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<FolderForm onSaved={reload} />}
    />
  );
  const importAction = (
    <Action.Push
      title="Import or Export Clipy XML"
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
      target={<ImportExport onDone={reload} />}
    />
  );

  return (
    <List searchBarPlaceholder="Search folders">
      <List.EmptyView
        icon={Icon.Folder}
        title="No Snippet Folders"
        description="Press ⌘N to create a folder, or ⌘⇧I to import a Clipy XML file."
        actions={
          <ActionPanel>
            {newFolderAction}
            {importAction}
          </ActionPanel>
        }
      />
      {folders.map((folder, idx) => (
        <List.Item
          key={folder.id}
          icon={folder.enabled ? Icon.Folder : { source: Icon.Folder, tintColor: "#888888" }}
          title={folder.title}
          subtitle={folder.enabled ? undefined : "Hidden"}
          accessories={[{ text: `${folder.snippets.length}` }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  title="Show Snippets"
                  icon={Icon.ArrowRight}
                  target={<FolderSnippets folderId={folder.id} onChanged={reload} />}
                />
                <Action.Push
                  title="Add Snippet"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                  target={<SnippetForm folderId={folder.id} onSaved={reload} />}
                />
                {newFolderAction}
                <Action.Push
                  title="Rename Folder"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={<FolderForm folder={folder} onSaved={reload} />}
                />
                <Action
                  title={folder.enabled ? "Hide from Menus" : "Show in Menus"}
                  icon={folder.enabled ? Icon.EyeDisabled : Icon.Eye}
                  shortcut={{ modifiers: ["cmd"], key: "h" }}
                  onAction={() => {
                    upsertFolder({ ...folder, enabled: !folder.enabled });
                    reload();
                  }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                {idx > 0 ? (
                  <Action
                    title="Move up"
                    icon={Icon.ArrowUp}
                    shortcut={Keyboard.Shortcut.Common.MoveUp}
                    onAction={() => {
                      moveFolder(folder.id, -1);
                      reload();
                    }}
                  />
                ) : null}
                {idx < folders.length - 1 ? (
                  <Action
                    title="Move Down"
                    icon={Icon.ArrowDown}
                    shortcut={Keyboard.Shortcut.Common.MoveDown}
                    onAction={() => {
                      moveFolder(folder.id, 1);
                      reload();
                    }}
                  />
                ) : null}
                {importAction}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Delete Folder"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
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
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function FolderSnippets({ folderId, onChanged }: { folderId: string; onChanged: () => void }) {
  const [folder, setFolder] = useState<SnippetFolder | undefined>(() => loadFolders().find((f) => f.id === folderId));
  const reload = () => {
    setFolder(loadFolders().find((f) => f.id === folderId));
    onChanged();
  };
  const snippets = folder?.snippets ?? [];

  const addAction = (
    <Action.Push
      title="Add Snippet"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<SnippetForm folderId={folderId} onSaved={reload} />}
    />
  );

  return (
    <List navigationTitle={folder?.title ?? "Snippets"} isShowingDetail={snippets.length > 0}>
      <List.EmptyView
        icon={Icon.Snippets}
        title="No Snippets"
        description="Press ⌘N to add one."
        actions={<ActionPanel>{addAction}</ActionPanel>}
      />
      {snippets.map((s, idx) => (
        <List.Item
          key={s.id}
          icon={Icon.Snippets}
          title={s.title}
          keywords={[firstLine(s.content)]}
          detail={<List.Item.Detail markdown={codeBlock(s.content)} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <PasteOrCopyActions content={s.content} title={s.title} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Push
                  title="Edit Snippet"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={<SnippetForm snippet={s} folderId={folderId} onSaved={reload} />}
                />
                {addAction}
                {idx > 0 ? (
                  <Action
                    title="Move up"
                    icon={Icon.ArrowUp}
                    shortcut={Keyboard.Shortcut.Common.MoveUp}
                    onAction={() => {
                      moveSnippet(folderId, s.id, -1);
                      reload();
                    }}
                  />
                ) : null}
                {idx < snippets.length - 1 ? (
                  <Action
                    title="Move Down"
                    icon={Icon.ArrowDown}
                    shortcut={Keyboard.Shortcut.Common.MoveDown}
                    onAction={() => {
                      moveSnippet(folderId, s.id, 1);
                      reload();
                    }}
                  />
                ) : null}
              </ActionPanel.Section>
              <ActionPanel.Section>
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
                    deleteSnippet(folderId, s.id);
                    reload();
                  }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
