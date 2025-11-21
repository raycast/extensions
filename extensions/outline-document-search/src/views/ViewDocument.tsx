import { Detail, ActionPanel, Action, showToast, Toast, Icon, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { OutlineApi, OutlineDocument } from "../api/OutlineApi";
import { Instance } from "../queryInstances";

interface ViewDocumentProps {
  documentId: string;
  instance: Instance;
}

export default function ViewDocument({ documentId, instance }: ViewDocumentProps) {
  const [document, setDocument] = useState<OutlineDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { pop } = useNavigation();
  const api = new OutlineApi(instance);

  useEffect(() => {
    async function fetchDocument() {
      setIsLoading(true);
      try {
        const doc = await api.getDocumentInfo(documentId);
        setDocument(doc);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load document",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchDocument();
  }, [documentId]);

  async function handleCreateShare() {
    if (!document) return;

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

  async function handleStar() {
    if (!document) return;

    try {
      await api.starDocument(document.id);
      await showToast({ style: Toast.Style.Success, title: "Document starred" });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to star",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!document) {
    return <Detail isLoading={isLoading} markdown="Loading document..." />;
  }

  const markdown = `# ${document.title}\n\n${document.text || "No content"}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Created" text={new Date(document.createdAt).toLocaleDateString()} />
          <Detail.Metadata.Label title="Updated" text={new Date(document.updatedAt).toLocaleDateString()} />
          {document.publishedAt && (
            <Detail.Metadata.Label title="Published" text={new Date(document.publishedAt).toLocaleDateString()} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={api.getDocumentUrl(document)} />
          <Action.CopyToClipboard
            title="Copy URL"
            content={api.getDocumentUrl(document)}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Create Share Link"
            icon={Icon.Link}
            onAction={handleCreateShare}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
          <Action
            title="Star Document"
            icon={Icon.Star}
            onAction={handleStar}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <Action title="Close" icon={Icon.XMarkCircle} onAction={pop} shortcut={{ modifiers: ["cmd"], key: "w" }} />
        </ActionPanel>
      }
    />
  );
}
