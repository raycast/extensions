import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  LaunchType,
  List,
  launchCommand,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { useDependencyCheck } from "./hooks/use-dependency-check";
import type { QmdCollection, QmdFileListItem } from "./types";
import { collectionsLogger } from "./utils/logger";
import {
  expandPath,
  getCollectionFiles,
  getCollections,
  runEmbed,
  runQmdRaw,
  validateCollectionPath,
} from "./utils/qmd";

export default function Command() {
  const { isLoading: isDepsLoading, isReady } = useDependencyCheck();
  const [collections, setCollections] = useState<QmdCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCollections = useCallback(async () => {
    if (!isReady) {
      return;
    }

    collectionsLogger.info("Loading collections");
    setIsLoading(true);
    const result = await getCollections();

    if (result.success && result.data) {
      const validated = result.data
        .map((col) => ({
          ...col,
          exists: col.path ? validateCollectionPath(col.path) : true,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setCollections(validated);
      collectionsLogger.info("Collections loaded", { count: validated.length });
    } else {
      collectionsLogger.warn("Failed to load collections", {
        error: result.error,
      });
      setCollections([]);
    }
    setIsLoading(false);
  }, [isReady]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  if (isDepsLoading) {
    return <List isLoading={true} searchBarPlaceholder="Checking dependencies..." />;
  }

  if (!isReady) {
    return (
      <List>
        <List.EmptyView
          description="Please install the required dependencies to use QMD"
          icon={Icon.Warning}
          title="Dependencies Required"
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search collections...">
      {collections.length === 0 && !isLoading && (
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Plus}
                onAction={() => launchCommand({ name: "add-collection", type: LaunchType.UserInitiated })}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                title="Add Collection"
              />
            </ActionPanel>
          }
          description="Add a collection to start indexing your markdown files"
          icon={Icon.Folder}
          title="No Collections"
        />
      )}

      {collections.map((collection) => (
        <CollectionItem collection={collection} key={collection.name} onRefresh={loadCollections} />
      ))}
    </List>
  );
}

interface CollectionItemProps {
  collection: QmdCollection;
  onRefresh: () => Promise<void>;
}

function CollectionItem({ collection, onRefresh }: CollectionItemProps) {
  const handleRename = async (newName: string) => {
    if (!newName.trim() || newName === collection.name) {
      return;
    }

    collectionsLogger.info("Renaming collection", {
      from: collection.name,
      to: newName,
    });
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Renaming collection...",
    });

    const result = await runQmdRaw(["collection", "rename", collection.name, newName.trim()]);

    if (result.success) {
      collectionsLogger.info("Collection renamed", { name: newName });
      toast.style = Toast.Style.Success;
      toast.title = "Collection renamed";
      await onRefresh();
    } else {
      collectionsLogger.error("Rename failed", { error: result.error });
      toast.style = Toast.Style.Failure;
      toast.title = "Rename failed";
      toast.message = result.error;
    }
  };

  const handleRemove = async () => {
    const confirmed = await confirmAlert({
      title: "Remove Collection?",
      message: `This will remove "${collection.name}" from the index. The files will not be deleted. Context descriptions will be preserved.`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    collectionsLogger.info("Removing collection", { name: collection.name });
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Removing collection...",
    });

    const result = await runQmdRaw(["collection", "remove", collection.name]);

    if (result.success) {
      collectionsLogger.info("Collection removed", { name: collection.name });
      toast.style = Toast.Style.Success;
      toast.title = "Collection removed";
      await onRefresh();
    } else {
      collectionsLogger.error("Remove failed", { error: result.error });
      toast.style = Toast.Style.Failure;
      toast.title = "Remove failed";
      toast.message = result.error;
    }
  };

  const handleReembed = async () => {
    collectionsLogger.info("Starting re-embed", {
      collection: collection.name,
    });
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating embeddings...",
      message: collection.name,
    });

    const result = await runEmbed(collection.name);

    if (result.success) {
      const output = result.data || "";
      collectionsLogger.info("Re-embed complete", {
        collection: collection.name,
      });
      toast.style = Toast.Style.Success;

      if (output.includes("already have embeddings")) {
        toast.title = "✓ Embeddings up-to-date";
      } else {
        toast.title = "✓ Embeddings generated";
      }
      toast.message = collection.name;
    } else {
      collectionsLogger.error("Re-embed failed", {
        collection: collection.name,
        error: result.error,
      });
      toast.style = Toast.Style.Failure;
      toast.title = "Embedding failed";
      toast.message = result.error;
    }

    onRefresh();
  };

  const handleUpdate = async (pullFirst: boolean) => {
    collectionsLogger.info("Updating collection", {
      collection: collection.name,
      pullFirst,
    });
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: pullFirst ? "Pulling and updating..." : "Updating index...",
      message: collection.name,
    });

    const args = ["update", "-c", collection.name];
    if (pullFirst) {
      args.push("--pull");
    }

    const result = await runQmdRaw(args, { timeout: 60_000 });

    if (result.success) {
      collectionsLogger.info("Update complete", {
        collection: collection.name,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Index updated";
      toast.message = collection.name;
      await onRefresh();
    } else {
      collectionsLogger.error("Update failed", {
        collection: collection.name,
        error: result.error,
      });
      toast.style = Toast.Style.Failure;
      toast.title = "Update failed";
      toast.message = result.error;
    }
  };

  const accessories: List.Item.Accessory[] = [
    { text: `${collection.documentCount} docs` },
    { text: collection.mask !== "**/*.md" ? collection.mask : undefined },
  ].filter((a) => a.text !== undefined);

  if (!collection.exists) {
    accessories.unshift({
      icon: { source: Icon.Warning, tintColor: Color.Orange },
      tooltip: "Path not found",
    });
  }

  return (
    <List.Item
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push icon={Icon.List} target={<CollectionFiles collection={collection} />} title="List Files" />
            {collection.exists && <Action.ShowInFinder path={expandPath(collection.path)} />}
            <Action
              icon={Icon.Plus}
              onAction={() => launchCommand({ name: "add-collection", type: LaunchType.UserInitiated })}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              title="Add Collection"
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Manage">
            <Action.Push
              icon={Icon.Pencil}
              target={<RenameForm currentName={collection.name} onRename={handleRename} />}
              title="Rename"
            />
            <Action
              icon={Icon.ArrowClockwise}
              onAction={handleReembed}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              title="Regenerate Embeddings"
            />
            <Action
              icon={Icon.ArrowClockwise}
              onAction={() => handleUpdate(false)}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
              title="Update Index"
            />
            <Action
              icon={Icon.Download}
              onAction={() => handleUpdate(true)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
              title="Pull & Update"
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              icon={Icon.Trash}
              onAction={handleRemove}
              shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
              style={Action.Style.Destructive}
              title="Remove Collection"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      icon={collection.exists ? Icon.Folder : { source: Icon.Warning, tintColor: Color.Orange }}
      subtitle={collection.path}
      title={collection.name}
    />
  );
}

interface RenameFormProps {
  currentName: string;
  onRename: (newName: string) => Promise<void>;
}

function RenameForm({ currentName, onRename }: RenameFormProps) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: { name: string }) => {
    setIsSubmitting(true);
    await onRename(values.name);
    setIsSubmitting(false);
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Rename" />
        </ActionPanel>
      }
      isLoading={isSubmitting}
    >
      <Form.TextField defaultValue={currentName} id="name" title="New Name" />
    </Form>
  );
}

interface CollectionFilesProps {
  collection: QmdCollection;
}

function CollectionFiles({ collection }: CollectionFilesProps) {
  const [files, setFiles] = useState<QmdFileListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFiles = async () => {
      const result = await getCollectionFiles(collection.name);
      if (result.success && result.data) {
        setFiles(result.data);
      }
      setIsLoading(false);
    };

    loadFiles();
  }, [collection.name]);

  return (
    <List isLoading={isLoading} navigationTitle={`Files in ${collection.name}`}>
      {files.map((file) => {
        const fullPath = `${expandPath(collection.path)}/${file.path}`;
        return (
          <List.Item
            accessories={[{ text: file.path.split("/").slice(0, -1).join("/") || "root" }]}
            actions={
              <ActionPanel>
                <Action.Open target={fullPath} title="Open File" />
                <Action.ShowInFinder path={fullPath} />
                <Action.CopyToClipboard content={fullPath} title="Copy Path" />
              </ActionPanel>
            }
            icon={Icon.Document}
            key={file.path}
            subtitle={file.path}
            title={file.title || file.path}
          />
        );
      })}

      {files.length === 0 && !isLoading && (
        <List.EmptyView description="This collection has no indexed files" icon={Icon.Document} title="No Files" />
      )}
    </List>
  );
}
