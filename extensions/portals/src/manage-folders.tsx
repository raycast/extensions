import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, ReactNode } from "react";
import { FolderNode } from "./types";
import { loadFolders, saveFolders, getAllFolders, updateNode, deleteNode, addChildNode } from "./storage";

function generateId(): string {
  return crypto.randomUUID();
}

// --- Folder Form (Add / Edit) ---

function FolderForm({ parentId, existing, onSave }: { parentId?: string; existing?: FolderNode; onSave: () => void }) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();
  const [, setShowDescription] = useState(existing?.showDescription ?? false);

  // Load all folders for the move destination dropdown
  const { data: allFolders } = usePromise(loadFolders);

  async function handleSubmit(values: {
    name: string;
    url: string;
    description: string;
    showDescription: boolean;
    moveChildren: boolean;
    moveTo: string;
  }) {
    if (!values.name.trim()) {
      setNameError("Name is required");
      return;
    }
    if (!values.url.trim()) {
      setUrlError("URL is required");
      return;
    }

    let folders = await loadFolders();

    if (existing) {
      // Build updated node keeping or stripping children based on moveChildren
      const updatedNode: FolderNode = {
        ...existing,
        name: values.name.trim(),
        url: values.url.trim(),
        description: values.description.trim(),
        showDescription: values.showDescription,
        // Keep children on the node itself always; move logic handles placement
        children: existing.children,
      };

      const destinationChanged = values.moveTo && values.moveTo !== "__current__" && values.moveTo !== "";

      if (destinationChanged) {
        // Extract the node from its current location
        const childrenToMove = values.moveChildren ? existing.children : undefined;
        const nodeToMove: FolderNode = {
          ...updatedNode,
          children: childrenToMove,
        };

        // Remove from current location
        folders = deleteNode(folders, existing.id);

        // If not moving children, reinsert children at original parent
        if (!values.moveChildren && existing.children?.length) {
          // Children become root-level items since we don't know their old parent here
          // Simplest safe behavior: add them to root
          folders = [...folders, ...existing.children];
        }

        // Place at destination
        if (values.moveTo === "__root__") {
          folders = [...folders, nodeToMove];
        } else {
          folders = addChildNode(folders, values.moveTo, nodeToMove);
        }
      } else {
        // No move, just update in place
        folders = updateNode(folders, existing.id, updatedNode);
      }
    } else {
      // New folder
      const newFolder: FolderNode = {
        id: generateId(),
        name: values.name.trim(),
        url: values.url.trim(),
        description: values.description.trim(),
        showDescription: values.showDescription,
      };

      if (parentId) {
        folders = addChildNode(folders, parentId, newFolder);
      } else {
        folders = [...folders, newFolder];
      }
    }

    await saveFolders(folders);
    await showToast({
      style: Toast.Style.Success,
      title: existing ? "Folder Updated" : "Folder Added",
    });
    onSave();
    pop();
  }

  return (
    <Form
      navigationTitle={existing ? "Edit Folder" : parentId ? "Add New Subfolder" : "Add New Folder"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={existing ? "Save Changes" : "Add Folder"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Folder Name"
        placeholder="e.g. Projects"
        defaultValue={existing?.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="url"
        title="URL"
        placeholder="e.g. https://dropbox.com/home/Projects"
        defaultValue={existing?.url}
        error={urlError}
        onChange={() => setUrlError(undefined)}
      />

      <Form.Separator />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional notes about this folder..."
        defaultValue={existing?.description}
      />
      <Form.Checkbox
        id="showDescription"
        label="Show description in Browse view"
        defaultValue={existing?.showDescription ?? false}
        onChange={setShowDescription}
      />

      {/* Only show move options when editing an existing folder */}
      {existing && (
        <>
          <Form.Separator />
          <Form.Dropdown id="moveTo" title="Move Folder To" defaultValue="__current__">
            <Form.Dropdown.Item value="__current__" title="Keep current location" />
            <Form.Dropdown.Item value="__root__" title="Root (top level)" />
            {getAllFolders(allFolders ?? [], existing.id).map((f) => (
              <Form.Dropdown.Item key={f.id} value={f.id} title={f.name} />
            ))}
          </Form.Dropdown>
          <Form.Checkbox id="moveChildren" label="Move subfolders with this folder" defaultValue={true} />
        </>
      )}
    </Form>
  );
}

// --- Export / Import ---

function ExportImportForm({ onDone }: { onDone: () => void }) {
  const { pop } = useNavigation();
  const { data: folders } = usePromise(loadFolders);
  const exportValue = folders ? JSON.stringify(folders, null, 2) : "";

  async function handleImport(values: { json: string }) {
    try {
      const parsed = JSON.parse(values.json) as FolderNode[];
      if (!Array.isArray(parsed)) throw new Error("Invalid format");

      function isValidNode(node: unknown): node is FolderNode {
        if (typeof node !== "object" || node === null) return false;
        const n = node as Record<string, unknown>;
        if (typeof n.id !== "string" || typeof n.name !== "string" || typeof n.url !== "string") return false;
        if (n.children !== undefined && (!Array.isArray(n.children) || !n.children.every(isValidNode))) return false;
        return true;
      }

      if (!parsed.every(isValidNode)) throw new Error("Invalid folder structure");
      await saveFolders(parsed);
      await showToast({ style: Toast.Style.Success, title: "Folders Imported" });
      onDone();
      pop();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid JSON",
        message: "Check the format and try again.",
      });
    }
  }

  return (
    <Form
      navigationTitle="Export / Import"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import from JSON" icon={Icon.Download} onSubmit={handleImport} />
          <Action.CopyToClipboard
            title="Export JSON"
            content={exportValue}
            icon={Icon.CopyClipboard}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "c" },
              Windows: { modifiers: ["ctrl", "shift"], key: "c" },
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Export"
        text="Press ⌘⇧C to copy your current folder tree as JSON for backup or sharing."
      />
      <Form.Separator />
      <Form.Description title="Import" text="Paste a previously exported JSON below and press Import." />
      <Form.TextArea id="json" title="" placeholder="Paste JSON here..." />
      <Form.Description title="" text="⚠️ This will replace your current folders." />
    </Form>
  );
}

// --- Folder Manager List ---

function FolderManagerList({
  folders,
  title,
  parentId,
  onRefresh,
  extraActions,
}: {
  folders: FolderNode[];
  title?: string;
  parentId?: string;
  onRefresh: () => void;
  extraActions?: ReactNode;
}) {
  const { push } = useNavigation();

  async function handleDelete(folder: FolderNode) {
    const confirmed = await confirmAlert({
      title: `Delete "${folder.name}"?`,
      message: folder.children?.length ? "This will also delete all subfolders inside it." : "This cannot be undone.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const allFolders = await loadFolders();
    const updated = deleteNode(allFolders, folder.id);
    await saveFolders(updated);
    await showToast({ style: Toast.Style.Success, title: "Folder Deleted" });
    onRefresh();
  }

  return (
    <List navigationTitle={title ?? "Edit Portals"} actions={<ActionPanel>{extraActions}</ActionPanel>}>
      {folders.length === 0 && (
        <List.EmptyView icon={Icon.Folder} title="No Folders" description="Press ⌘N to add your first folder." />
      )}
      {folders.map((folder) => (
        <List.Item
          key={folder.id}
          icon={folder.children?.length ? Icon.Folder : Icon.Document}
          title={folder.name}
          subtitle={folder.url}
          accessories={[
            ...(folder.description && folder.showDescription ? [{ icon: Icon.Text, tooltip: folder.description }] : []),
            ...(folder.children?.length
              ? [{ text: `${folder.children.length} subfolder${folder.children.length !== 1 ? "s" : ""}` }]
              : []),
          ]}
          actions={
            <ActionPanel>
              {folder.children && folder.children.length > 0 && (
                <Action
                  title="Manage Subfolders"
                  icon={Icon.ArrowRight}
                  onAction={() =>
                    push(
                      <FolderManagerList
                        folders={folder.children!}
                        title={folder.name}
                        parentId={folder.id}
                        onRefresh={onRefresh}
                      />,
                    )
                  }
                />
              )}
              <Action
                title="Add Subfolder"
                icon={Icon.Plus}
                shortcut={{ macOS: { modifiers: ["cmd"], key: "n" }, Windows: { modifiers: ["ctrl"], key: "n" } }}
                onAction={() => push(<FolderForm parentId={folder.id} onSave={onRefresh} />)}
              />
              <ActionPanel.Section>
                <Action
                  title="Create New Folder at This Level"
                  icon={Icon.Folder}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "n" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "n" },
                  }}
                  onAction={() => push(<FolderForm parentId={parentId} onSave={onRefresh} />)}
                />
              </ActionPanel.Section>
              <Action
                title="Edit Folder"
                icon={Icon.Pencil}
                shortcut={{ macOS: { modifiers: ["cmd"], key: "e" }, Windows: { modifiers: ["ctrl"], key: "e" } }}
                onAction={() => push(<FolderForm existing={folder} onSave={onRefresh} />)}
              />
              <ActionPanel.Section>
                <Action
                  title="Export / Import"
                  icon={Icon.ArrowsExpand}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "e" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "e" },
                  }}
                  onAction={() => push(<ExportImportForm onDone={onRefresh} />)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Delete Folder"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{
                    macOS: { modifiers: ["cmd"], key: "backspace" },
                    Windows: { modifiers: ["ctrl"], key: "backspace" },
                  }}
                  onAction={() => handleDelete(folder)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// --- Root Command ---

export default function Command() {
  const { data: folders, revalidate } = usePromise(loadFolders);
  const { push } = useNavigation();

  return (
    <FolderManagerList
      folders={folders ?? []}
      onRefresh={revalidate}
      extraActions={
        <>
          <Action
            title="Create New Folder"
            icon={Icon.Plus}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "n" }, Windows: { modifiers: ["ctrl"], key: "n" } }}
            onAction={() => push(<FolderForm onSave={revalidate} />)}
          />
          <Action
            title="Export / Import"
            icon={Icon.ArrowsExpand}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "e" },
              Windows: { modifiers: ["ctrl", "shift"], key: "e" },
            }}
            onAction={() => push(<ExportImportForm onDone={revalidate} />)}
          />
        </>
      }
    />
  );
}
