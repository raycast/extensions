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
    async function fetchStarredDocuments() {
      setIsLoading(true);
      try {
        const docs = await outlineApi.getStarredDocuments();
        setDocuments(docs);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load starred documents",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchStarredDocuments();
  }, []);

  async function handleUnstar(doc: OutlineDocument) {
    try {
      await outlineApi.unstarDocument(doc.id);
      setDocuments(documents.filter((d) => d.id !== doc.id));
      showToast({
        style: Toast.Style.Success,
        title: "Document unstarred",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to unstar document",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search starred documents..."
    >
      {documents.map((doc) => (
        <List.Item
          key={doc.id}
          title={doc.title}
          subtitle={
            (doc.text || "").substring(0, 50) +
            (doc.text && doc.text.length > 50 ? "..." : "")
          }
          icon={Icon.Star}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={outlineApi.getDocumentUrl(doc)} />
              <Action.CopyToClipboard
                title="Copy URL"
                content={outlineApi.getDocumentUrl(doc)}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title="Unstar Document"
                icon={Icon.StarDisabled}
                onAction={() => handleUnstar(doc)}
                shortcut={{ modifiers: ["cmd"], key: "u" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
