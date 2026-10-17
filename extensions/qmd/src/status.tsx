import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { useDependencyCheck } from "./hooks/use-dependency-check";
import type { QmdCollection, QmdFileListItem } from "./types";
import { collectionsLogger, logger } from "./utils/logger";
import { type ParsedStatus, parseStatus } from "./utils/parsers";
import {
  expandPath,
  getCollectionFiles,
  getCollections,
  getQmdDatabasePath,
  runEmbed,
  runQmdRaw,
  runUpdate,
} from "./utils/qmd";

const statusLogger = logger.child("[Status]");

interface StatusResult {
  status: ParsedStatus | null;
  error?: string;
}

async function fetchStatus(): Promise<StatusResult> {
  statusLogger.debug("Fetching QMD status");
  const result = await runQmdRaw(["status"]);

  if (result.success && result.data) {
    const parsed = parseStatus(result.data);
    statusLogger.debug("Status parsed", {
      collections: parsed?.collections.length,
    });
    return { status: parsed };
  }

  statusLogger.error("Failed to fetch status", {
    error: result.error,
    stderr: result.stderr,
  });

  // Extract more specific error information
  const errorMessage = result.stderr || result.error || "Unknown error";
  return { status: null, error: errorMessage };
}

export default function Command() {
  const { isLoading: isDepsLoading, isReady, status: depStatus } = useDependencyCheck();

  const {
    data: result,
    isLoading,
    revalidate,
  } = useCachedPromise(fetchStatus, [], {
    execute: isReady,
  });

  const status = result?.status;
  const error = result?.error;

  if (isDepsLoading) {
    return <List isLoading={true} searchBarPlaceholder="Checking dependencies..." />;
  }

  if (!isReady) {
    return (
      <List>
        <List.EmptyView
          description={`Please install: ${[
            !depStatus?.bunInstalled && "Bun",
            !depStatus?.qmdInstalled && "QMD",
            !depStatus?.sqliteInstalled && "SQLite",
          ]
            .filter(Boolean)
            .join(", ")}`}
          icon={Icon.Warning}
          title="Dependencies Required"
        />
      </List>
    );
  }

  if (!(status || isLoading)) {
    // Detect specific error types for better messaging
    const isDatabaseLocked = error?.includes("SQLITE_BUSY") || error?.includes("database is locked");
    const isEmbedRunning = error?.includes("embed") || error?.includes("embedding");

    let title = "Unable to Load Status";
    let description = "Try running `qmd status` in your terminal to diagnose the issue.";

    if (isDatabaseLocked) {
      title = "Database Temporarily Locked";
      description = isEmbedRunning
        ? "The QMD database is currently locked, likely due to an active embedding process. Please wait a moment and retry."
        : "The QMD database is currently locked by another process. Please wait a moment and retry.";
    }

    return (
      <List>
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} onAction={revalidate} title="Retry" />
              {error && <Action.CopyToClipboard content={error} title="Copy Error Details" />}
            </ActionPanel>
          }
          description={description}
          icon={isDatabaseLocked ? Icon.Clock : Icon.XMarkCircle}
          title={title}
        />
      </List>
    );
  }

  const healthIcon =
    status?.indexHealth === "healthy"
      ? { source: Icon.CheckCircle, tintColor: Color.Green }
      : { source: Icon.Warning, tintColor: Color.Yellow };

  const healthText = (() => {
    if (status?.indexHealth === "healthy") {
      return "Healthy";
    }
    if (status?.indexHealth === "needs-embedding") {
      return "Needs Embedding";
    }
    return "Needs Update";
  })();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search status...">
      <List.Section title="Index">
        <List.Item
          accessories={[{ text: healthText }]}
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} onAction={revalidate} title="Refresh" />
            </ActionPanel>
          }
          icon={healthIcon}
          title="Status"
        />
        <List.Item
          accessories={[{ text: status?.databaseSize }]}
          actions={
            <ActionPanel>
              <Action.ShowInFinder path={getQmdDatabasePath()} title="Show in Finder" />
              <Action.CopyToClipboard content={getQmdDatabasePath()} title="Copy Path" />
              <Action icon={Icon.ArrowClockwise} onAction={revalidate} title="Refresh" />
            </ActionPanel>
          }
          icon={Icon.HardDrive}
          subtitle={status?.databasePath}
          title="Database"
        />
        {status?.lastUpdated && (
          <List.Item accessories={[{ text: status.lastUpdated }]} icon={Icon.Clock} title="Last Updated" />
        )}
      </List.Section>

      <List.Section title="Documents">
        <List.Item
          accessories={[{ text: `${status?.totalDocuments ?? 0}` }]}
          icon={Icon.Document}
          title="Total Files"
        />
        <List.Item
          accessories={[
            {
              text: `${status?.embeddedDocuments ?? 0}`,
              icon: status?.pendingEmbeddings === 0 ? { source: Icon.CheckCircle, tintColor: Color.Green } : undefined,
            },
          ]}
          icon={Icon.Stars}
          title="Embedded"
        />
        {(status?.pendingEmbeddings ?? 0) > 0 && (
          <List.Item
            accessories={[{ text: `${status?.pendingEmbeddings}` }]}
            icon={{ source: Icon.Clock, tintColor: Color.Yellow }}
            title="Pending Embeddings"
          />
        )}
      </List.Section>

      <List.Section title={`Collections (${status?.collections.length ?? 0})`}>
        {status?.collections.map((collection) => (
          <List.Item
            accessories={[
              { text: `${collection.documentCount} files` },
              collection.lastUpdated ? { text: collection.lastUpdated, icon: Icon.Clock } : {},
              collection.contexts.length > 0
                ? {
                    text: `${collection.contexts.length} contexts`,
                    icon: Icon.Text,
                  }
                : {},
            ].filter((a) => Object.keys(a).length > 0)}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Cog}
                  target={<CollectionDetail collectionName={collection.name} onRefresh={revalidate} />}
                  title="Manage Collection"
                />
                <Action icon={Icon.ArrowClockwise} onAction={revalidate} title="Refresh" />
              </ActionPanel>
            }
            icon={Icon.Folder}
            key={collection.name}
            subtitle={collection.pattern}
            title={collection.name}
          />
        ))}
      </List.Section>
    </List>
  );
}

interface CollectionDetailProps {
  collectionName: string;
  onRefresh: () => void;
}

function CollectionDetail({ collectionName, onRefresh }: CollectionDetailProps) {
  const { pop } = useNavigation();
  const [collection, setCollection] = useState<QmdCollection | null>(null);
  const [files, setFiles] = useState<QmdFileListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const [collectionsResult, filesResult] = await Promise.all([
        getCollections(),
        getCollectionFiles(collectionName),
      ]);

      if (collectionsResult.success && collectionsResult.data) {
        const found = collectionsResult.data.find((c) => c.name === collectionName);
        if (found) {
          setCollection(found);
        }
      }

      if (filesResult.success && filesResult.data) {
        setFiles(filesResult.data);
      }

      setIsLoading(false);
    };

    loadData();
  }, [collectionName]);

  const handleReembed = async () => {
    collectionsLogger.info("Starting re-embed", { collection: collectionName });
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating embeddings...",
      message: collectionName,
    });

    const result = await runEmbed(collectionName);

    if (result.success) {
      const output = result.data || "";
      collectionsLogger.info("Re-embed complete", { collection: collectionName });
      toast.style = Toast.Style.Success;

      if (output.includes("already have embeddings")) {
        toast.title = "✓ Embeddings up-to-date";
      } else {
        toast.title = "✓ Embeddings generated";
      }
      toast.message = collectionName;
    } else {
      collectionsLogger.error("Re-embed failed", {
        collection: collectionName,
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
      collection: collectionName,
      pullFirst,
    });
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: pullFirst ? "Pulling and updating..." : "Updating index...",
      message: collectionName,
    });

    const result = await runUpdate(collectionName, { pullFirst });

    if (result.success) {
      collectionsLogger.info("Update complete", {
        collection: collectionName,
        pendingEmbeddings: result.pendingEmbeddings,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Index updated";

      if (result.pendingEmbeddings > 0) {
        toast.message = `${result.pendingEmbeddings} document${result.pendingEmbeddings === 1 ? "" : "s"} need${result.pendingEmbeddings === 1 ? "s" : ""} embeddings`;
        toast.primaryAction = {
          title: "Generate Embeddings",
          onAction: () => handleReembed(),
        };
      } else {
        toast.message = collectionName;
      }

      onRefresh();
    } else {
      collectionsLogger.error("Update failed", {
        collection: collectionName,
        error: result.error,
      });
      toast.style = Toast.Style.Failure;
      toast.title = "Update failed";
      toast.message = result.error;
    }
  };

  const handleRemove = async () => {
    const confirmed = await confirmAlert({
      title: "Remove Collection?",
      message: `This will remove "${collectionName}" from the index. The files will not be deleted.`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    collectionsLogger.info("Removing collection", { name: collectionName });
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Removing collection...",
    });

    const result = await runQmdRaw(["collection", "remove", collectionName]);

    if (result.success) {
      collectionsLogger.info("Collection removed", { name: collectionName });
      toast.style = Toast.Style.Success;
      toast.title = "Collection removed";
      onRefresh();
      pop();
    } else {
      collectionsLogger.error("Remove failed", { error: result.error });
      toast.style = Toast.Style.Failure;
      toast.title = "Remove failed";
      toast.message = result.error;
    }
  };

  const collectionPath = collection?.path ? expandPath(collection.path) : "";

  return (
    <List isLoading={isLoading} navigationTitle={collectionName}>
      <List.Section title="Collection">
        <List.Item
          accessories={[{ text: `${collection?.documentCount ?? 0} docs` }]}
          actions={
            <ActionPanel>
              {collectionPath && <Action.ShowInFinder path={collectionPath} />}
              {collectionPath && <Action.CopyToClipboard content={collectionPath} title="Copy Path" />}
            </ActionPanel>
          }
          icon={Icon.Folder}
          subtitle={collection?.path}
          title={collectionName}
        />
      </List.Section>

      <List.Section title="Actions">
        <List.Item
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} onAction={handleReembed} title="Regenerate Embeddings" />
            </ActionPanel>
          }
          icon={Icon.Stars}
          subtitle="Regenerate embeddings for this collection"
          title="Regenerate Embeddings"
        />
        <List.Item
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} onAction={() => handleUpdate(false)} title="Update Index" />
            </ActionPanel>
          }
          icon={Icon.ArrowClockwise}
          subtitle="Refresh the index for changed files"
          title="Update Index"
        />
        <List.Item
          actions={
            <ActionPanel>
              <Action icon={Icon.Download} onAction={() => handleUpdate(true)} title="Pull & Update" />
            </ActionPanel>
          }
          icon={Icon.Download}
          subtitle="Pull from git and update the index"
          title="Pull & Update"
        />
        <List.Item
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Trash}
                onAction={handleRemove}
                style={Action.Style.Destructive}
                title="Remove Collection"
              />
            </ActionPanel>
          }
          icon={{ source: Icon.Trash, tintColor: Color.Red }}
          subtitle="Remove this collection from the index"
          title="Remove Collection"
        />
      </List.Section>

      <List.Section title={`Files (${files.length})`}>
        {files.map((file) => {
          const fullPath = collectionPath ? `${collectionPath}/${file.path}` : file.path;
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
              icon={file.embedded ? Icon.Document : { source: Icon.Document, tintColor: Color.Yellow }}
              key={file.path}
              title={file.title || file.path}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
