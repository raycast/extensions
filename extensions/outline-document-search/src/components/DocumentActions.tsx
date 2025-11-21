import { ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { OutlineApi, OutlineDocument } from "../api/OutlineApi";
import { Instance } from "../queryInstances";
import ViewDocument from "../views/ViewDocument";
import EditDocument from "../views/EditDocument";
import DocumentComments from "../views/DocumentComments";
import DocumentRevisions from "../views/DocumentRevisions";

interface DocumentActionsProps {
  document: OutlineDocument;
  instance: Instance;
  onRefresh?: () => void;
}

export default function DocumentActions({ document, instance, onRefresh }: DocumentActionsProps) {
  const api = new OutlineApi(instance);

  async function handleStar() {
    try {
      await api.starDocument(document.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Document starred",
      });
      if (onRefresh) onRefresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to star document",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleUnstar() {
    try {
      await api.unstarDocument(document.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Document unstarred",
      });
      if (onRefresh) onRefresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to unstar document",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleCreateShare() {
    try {
      const share = await api.createShare(document.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Share link created",
        message: share.url,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create share link",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <ActionPanel>
      <Action.OpenInBrowser url={api.getDocumentUrl(document)} />
      <Action.Push
        title="View Content"
        icon={Icon.Eye}
        target={<ViewDocument documentId={document.id} instance={instance} />}
        shortcut={{ modifiers: ["cmd"], key: "v" }}
      />
      <Action.CopyToClipboard
        title="Copy URL"
        content={api.getDocumentUrl(document)}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      <Action
        title="Star Document"
        icon={Icon.Star}
        onAction={handleStar}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
      />
      <Action
        title="Unstar Document"
        icon={Icon.StarDisabled}
        onAction={handleUnstar}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      />
      <Action.Push
        title="Edit Document"
        icon={Icon.Pencil}
        target={<EditDocument documentId={document.id} instance={instance} onSave={onRefresh} />}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
      />
      <Action.Push
        title="View Comments"
        icon={Icon.Message}
        target={<DocumentComments documentId={document.id} documentTitle={document.title} instance={instance} />}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      <Action.Push
        title="View Revisions"
        icon={Icon.Clock}
        target={<DocumentRevisions documentId={document.id} documentTitle={document.title} instance={instance} />}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      />
      <Action
        title="Create Share Link"
        icon={Icon.Link}
        onAction={handleCreateShare}
        shortcut={{ modifiers: ["cmd"], key: "l" }}
      />
    </ActionPanel>
  );
}
