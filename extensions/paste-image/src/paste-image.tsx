import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api"
import { showFailureToast } from "@raycast/utils"
import { copyFile, rename } from "node:fs/promises"
import { homedir } from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { useEffect, useState } from "react"
import {
  ALL_FOLDERS_VIEW,
  CachedImage,
  ImageMetadataCache,
  clearImageMetadataCache,
  createCachedImage,
  createEmptyCache,
  findCachedImage,
  foldersMatchCache,
  getVisibleImages,
  isImageFile,
  loadImageMetadataCache,
  pathExists,
  rebuildImageMetadataCache,
  refreshFolderInCache,
  removeCachedImage,
  replaceCachedImage,
  saveImageMetadataCache,
} from "./image-cache"
import { createImagePreview } from "./image-preview"
import {
  clearImportedFolders,
  getImportedFolders,
  getRecentViewFolder,
  setImportedFolders,
  setRecentViewFolder,
} from "./storage"

export default function Command() {
  const [folders, setFolders] = useState<string[]>([])
  const [cache, setCache] = useState<ImageMetadataCache>(createEmptyCache())
  const [images, setImages] = useState<CachedImage[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [viewFolder, setViewFolder] = useState(ALL_FOLDERS_VIEW)
  const [isLoading, setIsLoading] = useState(true)
  const { push } = useNavigation()

  function syncState(
    nextCache: ImageMetadataCache,
    nextFolders: string[],
    requestedFolder: string,
    preferredSelection?: string | null,
  ): string {
    const validFolder =
      requestedFolder === ALL_FOLDERS_VIEW || nextFolders.includes(requestedFolder) ? requestedFolder : ALL_FOLDERS_VIEW
    const visibleImages = getVisibleImages(nextCache, validFolder)

    setCache(nextCache)
    setFolders(nextFolders)
    setViewFolder(validFolder)
    setImages(visibleImages)
    setSelected((currentSelection) => {
      const candidate = preferredSelection === undefined ? currentSelection : preferredSelection
      return candidate && visibleImages.some((image) => image.path === candidate)
        ? candidate
        : (visibleImages[0]?.path ?? null)
    })

    return validFolder
  }

  async function warnAboutUnavailableFolders(nextCache: ImageMetadataCache): Promise<void> {
    const unavailableFolders = Object.keys(nextCache.folderErrors)
    if (unavailableFolders.length === 0) return

    await showToast({
      style: Toast.Style.Failure,
      title: unavailableFolders.length === 1 ? "Folder is unavailable" : "Some folders are unavailable",
      message: unavailableFolders.map((folder) => path.basename(folder) || folder).join(", "),
    })
  }

  async function initialize(): Promise<void> {
    setIsLoading(true)
    try {
      const importedFolders = await getImportedFolders()
      const recentFolder = await getRecentViewFolder(importedFolders)

      if (importedFolders.length === 0) {
        await clearImageMetadataCache()
        syncState(createEmptyCache(), [], ALL_FOLDERS_VIEW, null)
        return
      }

      let nextCache = await loadImageMetadataCache()
      if (!nextCache || !foldersMatchCache(nextCache, importedFolders)) {
        nextCache = await rebuildImageMetadataCache(importedFolders)
        await saveImageMetadataCache(nextCache)
      }

      const validFolder = syncState(nextCache, importedFolders, recentFolder)
      if (validFolder !== recentFolder) await setRecentViewFolder(validFolder)
      await warnAboutUnavailableFolders(nextCache)
    } catch (error) {
      await showFailureToast(error, { title: "Could not load images" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void initialize()
  }, [])

  async function importFolders(selectedFolder: string | string[]): Promise<void> {
    const selectedFolders = Array.isArray(selectedFolder) ? selectedFolder : [selectedFolder]
    if (selectedFolders.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Select at least one folder" })
      return
    }

    setIsLoading(true)
    try {
      const updatedFolders = await setImportedFolders([...folders, ...selectedFolders])
      const nextViewFolder = selectedFolders.length === 1 ? path.resolve(selectedFolders[0]) : ALL_FOLDERS_VIEW
      const nextCache = await rebuildImageMetadataCache(updatedFolders)
      await Promise.all([saveImageMetadataCache(nextCache), setRecentViewFolder(nextViewFolder)])
      syncState(nextCache, updatedFolders, nextViewFolder)
      await showToast({
        style: Toast.Style.Success,
        title: selectedFolders.length === 1 ? "Folder imported" : `${selectedFolders.length} folders imported`,
      })
      await warnAboutUnavailableFolders(nextCache)
    } catch (error) {
      await showFailureToast(error, { title: "Could not import folders" })
    } finally {
      setIsLoading(false)
    }
  }

  async function refreshAllImages(preferredSelection: string | null = selected): Promise<void> {
    setIsLoading(true)
    try {
      const nextCache = await rebuildImageMetadataCache(folders)
      await saveImageMetadataCache(nextCache)
      syncState(nextCache, folders, viewFolder, preferredSelection)
      await showToast({ style: Toast.Style.Success, title: "Images refreshed" })
      await warnAboutUnavailableFolders(nextCache)
    } catch (error) {
      await showFailureToast(error, { title: "Could not refresh images" })
    } finally {
      setIsLoading(false)
    }
  }

  async function refreshImageFolder(folderPath: string, preferredSelection?: string | null) {
    const nextCache = await refreshFolderInCache(cache, folderPath, folders)
    await saveImageMetadataCache(nextCache)
    syncState(nextCache, folders, viewFolder, preferredSelection)
    return nextCache
  }

  async function handleFolderChange(folder: string): Promise<void> {
    setViewFolder(folder)
    await setRecentViewFolder(folder)
    const visibleImages = getVisibleImages(cache, folder)
    setImages(visibleImages)
    setSelected((currentSelection) =>
      currentSelection && visibleImages.some((image) => image.path === currentSelection)
        ? currentSelection
        : (visibleImages[0]?.path ?? null),
    )
  }

  async function handleImageTrashed(imagePath: string): Promise<void> {
    const latestCache = (await loadImageMetadataCache()) ?? cache
    const nextCache = removeCachedImage(latestCache, imagePath)
    await saveImageMetadataCache(nextCache)
    syncState(nextCache, folders, viewFolder, selected === imagePath ? null : selected)
  }

  async function handleRename(imagePath: string): Promise<void> {
    const refreshedCache = await refreshImageFolder(path.dirname(imagePath), imagePath)
    const image = findCachedImage(refreshedCache, imagePath)
    if (!image) {
      await showToast({ style: Toast.Style.Failure, title: "Image no longer exists" })
      return
    }

    push(
      <RenameImageForm
        image={image}
        onRename={async (newName) => {
          const nextName = newName.trim()
          if (!nextName || path.basename(nextName) !== nextName) {
            await showToast({ style: Toast.Style.Failure, title: "Enter a valid file name" })
            return false
          }
          if (!isImageFile(nextName)) {
            await showToast({ style: Toast.Style.Failure, title: "Use a supported image extension" })
            return false
          }

          const nextPath = path.join(image.folderPath, nextName)
          if (nextPath === image.path) return true
          if (await pathExists(nextPath)) {
            await showToast({ style: Toast.Style.Failure, title: "A file with that name already exists" })
            return false
          }

          try {
            await rename(image.path, nextPath)
            const nextImage = await createCachedImage(nextPath, image.folderPath)
            const latestCache = (await loadImageMetadataCache()) ?? refreshedCache
            const nextCache = replaceCachedImage(latestCache, image.path, nextImage)
            await saveImageMetadataCache(nextCache)
            syncState(nextCache, folders, viewFolder, nextPath)
            await showToast({ style: Toast.Style.Success, title: "Image renamed" })
            return true
          } catch (error) {
            await showFailureToast(error, { title: "Could not rename image" })
            return false
          }
        }}
      />,
    )
  }

  async function handleSaveToDesktop(image: CachedImage): Promise<void> {
    try {
      const destination = await nextAvailablePath(path.join(homedir(), "Desktop", image.name))
      await copyFile(image.path, destination)
      await showToast({
        style: Toast.Style.Success,
        title: "Saved to Desktop",
        message: path.basename(destination),
      })
    } catch (error) {
      await showFailureToast(error, { title: "Could not save image" })
    }
  }

  async function handleRemoveCurrentFolder(): Promise<void> {
    if (viewFolder === ALL_FOLDERS_VIEW) return
    const confirmed = await confirmAlert({
      title: "Remove Imported Folder?",
      message: `“${path.basename(viewFolder)}” will be removed from Paste Image. Files on disk will not be deleted.`,
      primaryAction: { title: "Remove Folder", style: Alert.ActionStyle.Destructive },
    })
    if (!confirmed) return

    const updatedFolders = await setImportedFolders(folders.filter((folder) => folder !== viewFolder))
    const nextCache = await rebuildImageMetadataCache(updatedFolders)
    await Promise.all([saveImageMetadataCache(nextCache), setRecentViewFolder(ALL_FOLDERS_VIEW)])
    syncState(nextCache, updatedFolders, ALL_FOLDERS_VIEW, null)
    await showToast({ style: Toast.Style.Success, title: "Folder removed" })
  }

  async function handleRemoveAllFolders(): Promise<void> {
    const confirmed = await confirmAlert({
      title: "Remove All Imported Folders?",
      message: "All folders will be removed from Paste Image. Files on disk will not be deleted.",
      primaryAction: { title: "Remove All", style: Alert.ActionStyle.Destructive },
    })
    if (!confirmed) return

    await Promise.all([clearImportedFolders(), clearImageMetadataCache()])
    syncState(createEmptyCache(), [], ALL_FOLDERS_VIEW, null)
    await showToast({ style: Toast.Style.Success, title: "All folders removed" })
  }

  const emptyTitle = folders.length === 0 ? "No Folders Imported" : "No Images Found"
  const emptyDescription =
    folders.length === 0
      ? "Import one or more folders to start searching and pasting images."
      : "This folder has no supported images. Try refreshing or import another folder."

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      selectedItemId={selected && images.some((image) => image.path === selected) ? selected : images[0]?.path}
      onSelectionChange={setSelected}
      searchBarPlaceholder="Search images by name…"
      searchBarAccessory={
        folders.length > 0 ? (
          <List.Dropdown tooltip="Filter by Folder" value={viewFolder} onChange={handleFolderChange}>
            <List.Dropdown.Item title="All Folders" value={ALL_FOLDERS_VIEW} />
            {folders.map((folderPath) => (
              <List.Dropdown.Item key={folderPath} title={path.basename(folderPath)} value={folderPath} />
            ))}
          </List.Dropdown>
        ) : null
      }
    >
      {images.length === 0 ? (
        <List.EmptyView
          title={emptyTitle}
          description={emptyDescription}
          icon={Icon.Image}
          actions={
            <ActionPanel>
              <Action.Push
                title="Import Folders"
                icon={Icon.Folder}
                target={<ChooseFolder onChoose={importFolders} />}
              />
              {folders.length > 0 ? (
                <Action title="Refresh Images" icon={Icon.ArrowClockwise} onAction={() => refreshAllImages()} />
              ) : null}
            </ActionPanel>
          }
        />
      ) : null}

      {images.map((image) => (
        <List.Item
          key={image.path}
          id={image.path}
          title={image.name}
          subtitle={viewFolder === ALL_FOLDERS_VIEW ? path.basename(image.folderPath) : undefined}
          icon={{ source: image.path }}
          quickLook={{ path: image.path, name: image.name }}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Paste title="Paste Image" content={{ file: image.path }} />
                <Action.CopyToClipboard title="Copy Image" content={{ file: image.path }} />
                <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Open title="Open Image" target={image.path} shortcut={Keyboard.Shortcut.Common.Open} />
                <Action.ShowInFinder path={image.path} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
                <Action
                  title="Save Copy to Desktop"
                  icon={Icon.Download}
                  shortcut={Keyboard.Shortcut.Common.Save}
                  onAction={() => handleSaveToDesktop(image)}
                />
                <Action
                  title="Rename Image"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  onAction={() => handleRename(image.path)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Refresh Images"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={() => refreshAllImages()}
                />
                <Action.Push
                  title="Import Folders"
                  icon={Icon.Folder}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                  target={<ChooseFolder onChoose={importFolders} />}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Trash
                  title="Move Image to Trash"
                  paths={image.path}
                  shortcut={{ modifiers: ["cmd"], key: "x" }}
                  onTrash={() => handleImageTrashed(image.path)}
                />
                {viewFolder !== ALL_FOLDERS_VIEW ? (
                  <Action
                    title="Remove Current Folder"
                    icon={Icon.MinusCircle}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={handleRemoveCurrentFolder}
                  />
                ) : null}
                <Action
                  title="Remove All Folders"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                  onAction={handleRemoveAllFolders}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
          detail={image.path === selected ? <ImageDetail image={image} /> : undefined}
        />
      ))}
    </List>
  )
}

function ImageDetail({ image }: { image: CachedImage }) {
  const [previewPath, setPreviewPath] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setPreviewPath(null)

    void createImagePreview(image)
      .then((createdPreviewPath) => {
        if (!cancelled) setPreviewPath(createdPreviewPath)
      })
      .catch(() => {
        if (!cancelled) setPreviewPath(image.path)
      })

    return () => {
      cancelled = true
    }
  }, [image.path, image.modifiedAt])

  return (
    <List.Item.Detail
      isLoading={!previewPath}
      markdown={previewPath ? createPreviewMarkdown(previewPath, image.name) : ""}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={image.name} />
          <List.Item.Detail.Metadata.Label title="Folder" text={image.folderPath} />
          <List.Item.Detail.Metadata.Label
            title="Format"
            text={path.extname(image.name).slice(1).toLocaleUpperCase()}
          />
          <List.Item.Detail.Metadata.Label title="Size" text={formatBytes(image.size)} />
          <List.Item.Detail.Metadata.Label title="Modified" text={new Date(image.modifiedAt).toLocaleString()} />
        </List.Item.Detail.Metadata>
      }
    />
  )
}

function ChooseFolder({ onChoose }: { onChoose: (folder: string | string[]) => Promise<void> }) {
  const { pop } = useNavigation()
  const [isLoading, setIsLoading] = useState(false)

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Import Image Folders"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Import Folders"
            icon={Icon.Folder}
            onSubmit={async (values: { folder: string[] }) => {
              setIsLoading(true)
              try {
                await onChoose(values.folder)
                pop()
              } finally {
                setIsLoading(false)
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="folder" title="Folders" canChooseFiles={false} canChooseDirectories allowMultipleSelection />
    </Form>
  )
}

function RenameImageForm({ image, onRename }: { image: CachedImage; onRename: (newName: string) => Promise<boolean> }) {
  const { pop } = useNavigation()
  const [value, setValue] = useState(image.name)
  const [isLoading, setIsLoading] = useState(false)
  const error = !value.trim()
    ? "A file name is required"
    : path.basename(value.trim()) !== value.trim()
      ? "The name cannot contain folder separators"
      : !isImageFile(value.trim())
        ? "Use a supported image extension"
        : undefined

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Rename Image"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename Image"
            icon={Icon.Pencil}
            onSubmit={async () => {
              if (error) return
              setIsLoading(true)
              const renamed = await onRename(value)
              setIsLoading(false)
              if (renamed) pop()
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="File Name" value={value} onChange={setValue} error={error} autoFocus />
    </Form>
  )
}

async function nextAvailablePath(desiredPath: string): Promise<string> {
  if (!(await pathExists(desiredPath))) return desiredPath

  const extension = path.extname(desiredPath)
  const baseName = path.basename(desiredPath, extension)
  const directory = path.dirname(desiredPath)
  let copyNumber = 2

  while (true) {
    const candidate = path.join(directory, `${baseName} ${copyNumber}${extension}`)
    if (!(await pathExists(candidate))) return candidate
    copyNumber += 1
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1_000) return `${bytes} B`
  if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(1)} KB`
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  return `${(bytes / 1_000_000_000).toFixed(1)} GB`
}

function createPreviewMarkdown(previewPath: string, imageName: string): string {
  return `![${escapeMarkdown(imageName)}](${pathToFileURL(previewPath).href})`
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\[\]]/g, "\\$&")
}
