import { Action, ActionPanel, Alert, Icon, LaunchType, List, confirmAlert, launchCommand } from "@raycast/api";
import { formatBytes } from "./lib/format";
import { useDocumentList } from "./hooks/useDocumentList";
import { getStatusAccessory } from "./utils/ui-helpers";

export default function ListFilesCommand() {
  const { documents, isLoading, isRefreshing, refresh, deleteDocument, deleteAllDocuments } = useDocumentList();

  const openUploadCommand = async () => {
    await launchCommand({ name: "upload-files", type: LaunchType.UserInitiated });
  };

  const handleDelete = async (documentId: string, documentName: string) => {
    const shouldDelete = await confirmAlert({
      title: "Delete Document?",
      message: `Delete "${documentName}" from your library? This cannot be undone!`,
      icon: Icon.Trash,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!shouldDelete) {
      return;
    }

    await deleteDocument(documentId);
  };

  const handleDeleteAll = async () => {
    const shouldDeleteAll = await confirmAlert({
      title: "Delete Every Document?",
      message: "This will permanently remove all documents from your library.",
      icon: Icon.Exclamationmark3,
      primaryAction: {
        title: "Delete All Documents",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!shouldDeleteAll) {
      return;
    }

    await deleteAllDocuments();
  };

  return (
    <List
      isLoading={isLoading || isRefreshing}
      searchBarPlaceholder="Filter documents..."
      isShowingDetail={false}
      navigationTitle="Great Library Documents"
    >
      {documents.length === 0 ? (
        <List.EmptyView
          icon={Icon.Tray}
          title="No documents yet"
          description="Upload files to build your library."
          actions={
            <ActionPanel>
              <Action title="Upload Files" icon={Icon.ArrowUpCircle} onAction={openUploadCommand} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
            </ActionPanel>
          }
        />
      ) : (
        documents.map((doc) => (
          <List.Item
            key={doc.id}
            title={doc.name}
            subtitle={formatBytes(doc.size)}
            accessories={[getStatusAccessory(doc.status), { date: new Date(doc.uploadDate) }]}
            actions={
              <ActionPanel>
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
                <Action title="Upload More Files" icon={Icon.ArrowUpCircle} onAction={openUploadCommand} />
                <Action.CopyToClipboard
                  title="Copy Document ID"
                  content={doc.id}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action
                  title="Delete File"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(doc.id, doc.name)}
                />
                <Action
                  title="Delete All Documents"
                  icon={Icon.Exclamationmark3}
                  style={Action.Style.Destructive}
                  onAction={handleDeleteAll}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
