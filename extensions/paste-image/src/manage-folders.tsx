import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  launchCommand,
  showToast,
} from "@raycast/api"
import { showFailureToast } from "@raycast/utils"
import path from "node:path"
import { useEffect, useState } from "react"
import { ALL_FOLDERS_VIEW } from "./constants"
import { clearImageMetadataCache, rebuildImageMetadataCache, saveImageMetadataCache } from "./image-cache"
import {
  clearImportedFolders,
  getImportedFolders,
  getRecentViewFolder,
  setImportedFolders,
  setRecentViewFolder,
} from "./storage"

export default function ManageFoldersCommand() {
  const [folders, setFolders] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        setFolders(await getImportedFolders())
      } catch (error) {
        await showFailureToast(error, { title: "Could not load imported folders" })
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  function openImportCommand(): void {
    void launchCommand({ name: "import-folder", type: LaunchType.UserInitiated })
  }

  async function handleRemoveFolder(folder: string): Promise<void> {
    const confirmed = await confirmAlert({
      title: "Remove Imported Folder?",
      message: `“${path.basename(folder)}” will be removed from Paste Image. Files on disk will not be deleted.`,
      primaryAction: { title: "Remove Folder", style: Alert.ActionStyle.Destructive },
    })
    if (!confirmed) return

    setIsLoading(true)
    try {
      const updatedFolders = await setImportedFolders(folders.filter((currentFolder) => currentFolder !== folder))
      const recentFolder = await getRecentViewFolder(folders)
      if (recentFolder === folder) await setRecentViewFolder(ALL_FOLDERS_VIEW)

      if (updatedFolders.length === 0) {
        await clearImageMetadataCache()
      } else {
        await saveImageMetadataCache(await rebuildImageMetadataCache(updatedFolders))
      }

      setFolders(updatedFolders)
      setSelected(null)
      await showToast({ style: Toast.Style.Success, title: "Folder removed" })
    } catch (error) {
      await showFailureToast(error, { title: "Could not remove folder" })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRemoveAll(): Promise<void> {
    const confirmed = await confirmAlert({
      title: "Remove All Imported Folders?",
      message: "All folders will be removed from Paste Image. Files on disk will not be deleted.",
      primaryAction: { title: "Remove All", style: Alert.ActionStyle.Destructive },
    })
    if (!confirmed) return

    try {
      await Promise.all([clearImportedFolders(), clearImageMetadataCache()])
      setFolders([])
      setSelected(null)
      await showToast({ style: Toast.Style.Success, title: "All folders removed" })
    } catch (error) {
      await showFailureToast(error, { title: "Could not remove folders" })
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Manage Imported Folders"
      selectedItemId={selected && folders.includes(selected) ? selected : folders[0]}
      onSelectionChange={setSelected}
      searchBarPlaceholder="Search imported folders…"
      actions={
        <ActionPanel>
          <Action title="Import Folders" icon={Icon.Folder} onAction={openImportCommand} />
        </ActionPanel>
      }
    >
      {folders.length === 0 ? (
        <List.EmptyView
          title="No Folders Imported"
          description="Import one or more folders to make their images searchable."
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action title="Import Folders" icon={Icon.Folder} onAction={openImportCommand} />
            </ActionPanel>
          }
        />
      ) : null}

      {folders.map((folder) => (
        <List.Item
          key={folder}
          id={folder}
          title={path.basename(folder)}
          subtitle={folder}
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.ShowInFinder path={folder} />
                <Action
                  title="Import More Folders"
                  icon={Icon.Folder}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                  onAction={openImportCommand}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Remove Folder"
                  icon={Icon.MinusCircle}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "x" }}
                  onAction={() => handleRemoveFolder(folder)}
                />
                <Action
                  title="Remove All Folders"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                  onAction={handleRemoveAll}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}
