import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import { outlineApi, OutlineDocument } from "./api/outline";

export default function Command() {
  const [documents, setDocuments] = useState<OutlineDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentDocuments() {
      setIsLoading(true);
      try {
        const docs = await outlineApi.getRecentDocuments();
        setDocuments(docs);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load recent documents",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecentDocuments();
  }, []);

  async function handleStar(doc: OutlineDocument) {
    try {
      await outlineApi.starDocument(doc.id);
      showToast({
        style: Toast.Style.Success,
        title: "Document starred",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to star document",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search recent documents..."
    >
      {documents.map((doc) => (
        <List.Item
          key={doc.id}
          title={doc.title}
          subtitle={
            (doc.text || "").substring(0, 50) +
            (doc.text && doc.text.length > 50 ? "..." : "")
          }
          icon={Icon.Clock}
          accessories={[{ date: new Date(doc.updatedAt) }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={outlineApi.getDocumentUrl(doc)} />
              <Action.CopyToClipboard
                title="Copy URL"
                content={outlineApi.getDocumentUrl(doc)}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title="Star Document"
                icon={Icon.Star}
                onAction={() => handleStar(doc)}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
