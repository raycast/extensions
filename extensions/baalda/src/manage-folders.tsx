import { Action, ActionPanel, Alert, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  deleteFolder,
  listFolders,
  listNotes,
  listVaults,
  prefs,
  type Folder,
  type NoteSummary,
  type Vault,
} from "./lib/baalda";
import { NoteDetailView } from "./components/note-forms";
import { CreateFolderForm, MoveFolderForm } from "./components/folder-forms";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function chooseDefaultVault(vaults: Vault[]): string {
  const preferred = prefs().defaultVaultId?.trim().toLowerCase();
  return (
    (preferred &&
      vaults.find((vault) => vault.vaultId.toLowerCase() === preferred || vault.name.toLowerCase() === preferred)
        ?.vaultId) ??
    vaults[0]?.vaultId ??
    ""
  );
}

export default function ManageFolders() {
  const { data: vaults, isLoading: loadingVaults } = useCachedPromise(listVaults, [], {
    onError: (error) =>
      void showToast({
        style: Toast.Style.Failure,
        title: "Couldn't load vaults",
        message: errorMessage(error),
      }),
  });
  const [vaultId, setVaultId] = useState("");

  useEffect(() => {
    if (!vaultId && vaults?.length) setVaultId(chooseDefaultVault(vaults));
  }, [vaultId, vaults]);

  const {
    data: folders,
    isLoading: loadingFolders,
    revalidate,
  } = useCachedPromise((id: string) => (id ? listFolders(id) : Promise.resolve([] as Folder[])), [vaultId], {
    onError: (error) =>
      void showToast({
        style: Toast.Style.Failure,
        title: "Couldn't load folders",
        message: errorMessage(error),
      }),
  });
  const selectedVault = vaults?.find((vault) => vault.vaultId === vaultId);

  return (
    <List
      isLoading={loadingVaults || loadingFolders}
      searchBarPlaceholder="Filter folders by path…"
      searchBarAccessory={
        vaults && vaults.length > 1 ? (
          <List.Dropdown tooltip="Vault" value={vaultId} onChange={setVaultId} storeValue>
            {vaults.map((vault) => (
              <List.Dropdown.Item key={vault.vaultId} title={vault.name} value={vault.vaultId} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.Section title="Actions">
        <List.Item
          icon={Icon.Plus}
          title="Create Folder"
          subtitle="Create a folder under the selected vault or an existing folder"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Folder"
                icon={Icon.Folder}
                target={<CreateFolderForm defaultVaultId={vaultId} onDone={() => void revalidate()} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title={selectedVault ? selectedVault.name : "Folders"}>
        {(folders ?? []).map((folder) => (
          <FolderItem key={folder.folderId} vaultId={vaultId} folder={folder} onChanged={() => void revalidate()} />
        ))}
      </List.Section>
    </List>
  );
}

function FolderItem({ vaultId, folder, onChanged }: { vaultId: string; folder: Folder; onChanged: () => void }) {
  return (
    <List.Item
      icon={Icon.Folder}
      title={folder.name}
      subtitle={folder.path}
      accessories={folder.parentId ? [{ tag: "nested" }] : []}
      actions={
        <ActionPanel>
          <Action.Push
            title="Open Folder Notes"
            icon={Icon.Document}
            target={<FolderNotesView vaultId={vaultId} folder={folder} />}
          />
          <Action.Push
            title="Move or Rename Folder"
            icon={Icon.ArrowRight}
            target={<MoveFolderForm vaultId={vaultId} folder={folder} onDone={onChanged} />}
          />
          <Action
            title="Delete Empty Folder"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => void deleteFolderWithConfirmation(folder, false, onChanged)}
          />
          <Action
            title="Delete Folder and Contents"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => void deleteFolderWithConfirmation(folder, true, onChanged)}
          />
          <Action.CopyToClipboard title="Copy Folder ID" content={folder.folderId} />
        </ActionPanel>
      }
    />
  );
}

async function deleteFolderWithConfirmation(folder: Folder, recursive: boolean, onChanged: () => void) {
  const confirmed = await confirmAlert({
    title: recursive ? `Delete "${folder.path}" and all contents?` : `Delete empty folder "${folder.path}"?`,
    message: recursive
      ? "Notes will be soft-deleted and subfolders will be removed."
      : "This will only succeed if the folder is empty.",
    primaryAction: { title: "Delete Folder", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) return;

  const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting folder…" });
  try {
    const result = await deleteFolder(folder.folderId, recursive);
    toast.style = Toast.Style.Success;
    toast.title = recursive ? `Deleted folder and ${result.deletedNotes} note(s)` : "Folder deleted";
    onChanged();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Delete failed";
    toast.message = errorMessage(error);
  }
}

function FolderNotesView({ vaultId, folder }: { vaultId: string; folder: Folder }) {
  const { data: notes, isLoading } = useCachedPromise(listNotes, [vaultId, folder.folderId], {
    onError: (error) =>
      void showToast({
        style: Toast.Style.Failure,
        title: "Couldn't load folder notes",
        message: errorMessage(error),
      }),
  });

  return (
    <List isLoading={isLoading} navigationTitle={folder.path} searchBarPlaceholder="Filter notes…">
      {(notes ?? []).map((note: NoteSummary) => (
        <List.Item
          key={note.docId}
          icon={Icon.Document}
          title={note.title}
          subtitle={note.relPath}
          actions={
            <ActionPanel>
              <Action.Push title="Open Note" icon={Icon.Book} target={<NoteDetailView docId={note.docId} />} />
              <Action.CopyToClipboard title="Copy Note ID" content={note.docId} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
