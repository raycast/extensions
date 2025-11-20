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
import ViewDocument from "./view-document";
import DocumentComments from "./document-comments";
import DocumentRevisions from "./document-revisions";
import EditDocument from "./edit-document";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [allDocuments, setAllDocuments] = useState<OutlineDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all documents on mount
  useEffect(() => {
    async function fetchDocuments() {
      setIsLoading(true);
      try {
        const docs = await outlineApi.listDocuments();
        setAllDocuments(docs);
      } catch (error) {
        console.error("Failed to load documents:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load documents",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchDocuments();
  }, []);

  // Filter documents locally based on search text
  const filteredDocuments = searchText.trim()
    ? allDocuments.filter((doc) => {
        const searchLower = searchText.toLowerCase();
        return (
          doc.title.toLowerCase().includes(searchLower) ||
          (doc.text && doc.text.toLowerCase().includes(searchLower))
        );
      })
    : allDocuments;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Outline documents..."
      throttle
    >
      {filteredDocuments.map((doc) => (
        <List.Item
          key={doc.id}
          title={doc.title}
          subtitle={
            (doc.text || "").substring(0, 50) +
            (doc.text && doc.text.length > 50 ? "..." : "")
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={outlineApi.getDocumentUrl(doc)} />
              <Action.Push
                title="View Content"
                icon={Icon.Eye}
                target={<ViewDocument documentId={doc.id} />}
                shortcut={{ modifiers: ["cmd"], key: "v" }}
              />
              <Action.CopyToClipboard
                title="Copy URL"
                content={outlineApi.getDocumentUrl(doc)}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title="Star Document"
                icon={Icon.Star}
                onAction={async () => {
                  try {
                    await outlineApi.starDocument(doc.id);
                    showToast({
                      style: Toast.Style.Success,
                      title: "Document starred",
                    });
                  } catch (error) {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to star",
                      message:
                        error instanceof Error ? error.message : String(error),
                    });
                  }
                }}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
              <Action.Push
                title="Edit Document"
                icon={Icon.Pencil}
                target={<EditDocument documentId={doc.id} />}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action.Push
                title="View Comments"
                icon={Icon.Message}
                target={
                  <DocumentComments
                    documentId={doc.id}
                    documentTitle={doc.title}
                  />
                }
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.Push
                title="View Revisions"
                icon={Icon.Clock}
                target={
                  <DocumentRevisions
                    documentId={doc.id}
                    documentTitle={doc.title}
                  />
                }
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
