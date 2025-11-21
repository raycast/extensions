import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useState, useEffect } from "react";
import { Instance } from "./queryInstances";
import { OutlineApi, Collection, OutlineDocument } from "./api/OutlineApi";
import DocumentActions from "./components/DocumentActions";
import EmptyList from "./EmptyList";

export default function Command() {
  const { value: instances } = useLocalStorage<Instance[]>("instances");
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [documents, setDocuments] = useState<OutlineDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!instances || instances.length === 0) {
      setIsLoading(false);
      return;
    }

    // If only one instance, select it automatically
    if (instances.length === 1) {
      handleSelectInstance(instances[0]);
    } else {
      setIsLoading(false);
    }
  }, [instances]);

  async function handleSelectInstance(instance: Instance) {
    setSelectedInstance(instance);
    setIsLoading(true);
    try {
      const api = new OutlineApi(instance);
      const cols = await api.listCollections();
      setCollections(cols);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load collections",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSelectCollection(collection: Collection) {
    if (!selectedInstance) return;

    setSelectedCollection(collection);
    setIsLoading(true);
    try {
      const api = new OutlineApi(selectedInstance);
      const docs = await api.getCollectionDocuments(collection.id);
      setDocuments(docs);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load documents",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleBack() {
    if (selectedCollection) {
      setSelectedCollection(null);
      setDocuments([]);
    } else if (selectedInstance && instances && instances.length > 1) {
      setSelectedInstance(null);
      setCollections([]);
    }
  }

  if (!instances || instances.length === 0) {
    return (
      <List>
        <EmptyList />
      </List>
    );
  }

  // Show documents in selected collection
  if (selectedCollection && selectedInstance) {
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder={`Search in ${selectedCollection.name}...`}
        navigationTitle={selectedCollection.name}
      >
        <List.Item
          title="← Back to Collections"
          icon={Icon.ArrowLeft}
          actions={
            <ActionPanel>
              <Action title="Back" onAction={handleBack} />
            </ActionPanel>
          }
        />
        {documents.map((doc) => (
          <List.Item
            key={doc.id}
            title={doc.title}
            subtitle={(doc.text || "").substring(0, 50) + (doc.text && doc.text.length > 50 ? "..." : "")}
            icon={Icon.Document}
            actions={<DocumentActions document={doc} instance={selectedInstance} />}
          />
        ))}
      </List>
    );
  }

  // Show collections for selected instance
  if (selectedInstance) {
    return (
      <List isLoading={isLoading} searchBarPlaceholder="Search collections...">
        {instances && instances.length > 1 && (
          <List.Item
            title="← Back to Instances"
            icon={Icon.ArrowLeft}
            actions={
              <ActionPanel>
                <Action title="Back" onAction={handleBack} />
              </ActionPanel>
            }
          />
        )}
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

  // Show instance selection (only if multiple instances)
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select an instance...">
      {instances.map((instance) => (
        <List.Item
          key={instance.name}
          title={instance.name}
          subtitle={instance.url}
          icon={Icon.Globe}
          actions={
            <ActionPanel>
              <Action title="View Collections" icon={Icon.ArrowRight} onAction={() => handleSelectInstance(instance)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
