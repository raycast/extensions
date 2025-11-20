import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import { outlineApi, Collection, OutlineDocument } from "./api/outline";

export default function Command() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] =
    useState<Collection | null>(null);
  const [documents, setDocuments] = useState<OutlineDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCollections() {
      setIsLoading(true);
      try {
        const cols = await outlineApi.listCollections();
        setCollections(cols);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load collections",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchCollections();
  }, []);

  async function handleSelectCollection(collection: Collection) {
    setSelectedCollection(collection);
    setIsLoading(true);
    try {
      const docs = await outlineApi.getCollectionDocuments(collection.id);
      setDocuments(docs);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load documents",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (selectedCollection) {
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder={`Search in ${selectedCollection.name}...`}
        navigationTitle={selectedCollection.name}
      >
        {documents.map((doc) => (
          <List.Item
            key={doc.id}
            title={doc.title}
            subtitle={
              (doc.text || "").substring(0, 50) +
              (doc.text && doc.text.length > 50 ? "..." : "")
            }
            icon={Icon.Document}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={outlineApi.getDocumentUrl(doc)} />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={outlineApi.getDocumentUrl(doc)}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Back to Collections"
                  icon={Icon.ArrowLeft}
                  onAction={() => setSelectedCollection(null)}
                  shortcut={{ modifiers: ["cmd"], key: "b" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search collections...">
      {collections.map((collection) => (
        <List.Item
          key={collection.id}
          title={collection.name}
          subtitle={collection.description}
          icon={{ source: Icon.Folder, tintColor: collection.color }}
          actions={
            <ActionPanel>
              <Action
                title="View Documents"
                icon={Icon.ArrowRight}
                onAction={() => handleSelectCollection(collection)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
