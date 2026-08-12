import {
  List,
  ActionPanel,
  Action,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useDocuments } from "./hooks/useDocuments";
import { DocumentDetail } from "./components/DocumentDetail";
import { DocumentForm } from "./components/DocumentForm";
import { SearchResults } from "./components/SearchResults";
import { readDocumentContent, getDocumentFilePath } from "./lib/storage";
import { useState, useEffect } from "react";
import type { Document } from "./types";

export default function ListDocuments() {
  const { documents, isLoading, deleteDocument } = useDocuments();

  async function handleDelete(doc: Document) {
    if (
      await confirmAlert({
        title: "Delete Document",
        message: `Are you sure you want to delete "${doc.title}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      await deleteDocument(doc.id);
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search documents by title or tag..."
    >
      {documents.length === 0 ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No documents yet"
          description="Create your first markdown document"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Document"
                icon={Icon.Plus}
                target={<DocumentForm />}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section
            title="Documents"
            subtitle={`${documents.length} items`}
          >
            {documents.map((doc) => (
              <DocumentListItem
                key={doc.id}
                document={doc}
                onDelete={handleDelete}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

interface DocumentListItemProps {
  document: Document;
  onDelete: (doc: Document) => Promise<void>;
}

function DocumentListItem({ document, onDelete }: DocumentListItemProps) {
  const [content, setContent] = useState("");

  useEffect(() => {
    readDocumentContent(document.filename).then(setContent);
  }, [document.filename]);

  const filePath = getDocumentFilePath(document.filename);

  return (
    <List.Item
      title={document.title}
      subtitle={document.tags.join(", ")}
      keywords={[...document.tags, document.shortcut || ""].filter(Boolean)}
      accessories={
        document.shortcut
          ? [
              { tag: `${document.shortcut}:` },
              { date: new Date(document.updatedAt) },
            ]
          : [{ date: new Date(document.updatedAt) }]
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="View">
            <Action.Push
              title="View Document"
              icon={Icon.Eye}
              target={<DocumentDetail documentId={document.id} />}
            />
            <Action.Push
              title="Search in Document"
              icon={Icon.MagnifyingGlass}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              target={
                <SearchResults documentId={document.id} content={content} />
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Edit">
            <Action.Push
              title="Edit Document"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={<DocumentForm document={document} content={content} />}
            />
            <Action.Push
              title="Create New Document"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<DocumentForm />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="File">
            <Action.ShowInFinder path={filePath} />
            <Action.OpenWith path={filePath} />
            <Action.CopyToClipboard title="Copy File Path" content={filePath} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Danger">
            <Action
              title="Delete Document"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={() => onDelete(document)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
