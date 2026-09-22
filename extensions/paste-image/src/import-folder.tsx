import { Action, ActionPanel, Form, Icon, LaunchType, List, Toast, launchCommand, showToast } from "@raycast/api"
import { showFailureToast } from "@raycast/utils"
import { useState } from "react"
import { rebuildImageMetadataCache, saveImageMetadataCache } from "./image-cache"
import { getImportedFolders, setImportedFolders } from "./storage"

export default function Command() {
  async function handleImport(values: { folders: string[] }): Promise<void> {
    if (values.folders.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Select at least one folder" })
      return
    }

    try {
      const currentFolders = await getImportedFolders()
      const folders = await setImportedFolders([...currentFolders, ...values.folders])
      const cache = await rebuildImageMetadataCache(folders)
      await saveImageMetadataCache(cache)

      await showToast({
        style: Toast.Style.Success,
        title: values.folders.length === 1 ? "Folder imported" : `${values.folders.length} folders imported`,
        primaryAction: {
          title: "Search Images",
          shortcut: { modifiers: [], key: "enter" },
          onAction: () => void launchCommand({ name: "paste-image", type: LaunchType.UserInitiated }),
        },
      })
    } catch (error) {
      await showFailureToast(error, { title: "Could not import folders" })
    }
  }

  return (
    <List navigationTitle="Import Image Folders" searchBarPlaceholder="Import image folders…">
      <List.EmptyView
        icon={{ source: "extension-icon.png" }}
        title="Import Image Folders"
        description="Select image folders from your computer to continue"
        actions={
          <ActionPanel>
            <Action.Push
              title="Select Folders"
              icon={Icon.Folder}
              target={<FolderPickerForm onSubmit={handleImport} />}
            />
          </ActionPanel>
        }
      />
    </List>
  )
}

function FolderPickerForm({ onSubmit }: { onSubmit: (values: { folders: string[] }) => Promise<void> }) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(values: { folders: string[] }): Promise<void> {
    setIsLoading(true)
    try {
      await onSubmit(values)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Select Image Folders"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Folders" icon={Icon.Folder} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folders"
        title="Folders"
        canChooseFiles={false}
        canChooseDirectories
        allowMultipleSelection
      />
    </Form>
  )
}
