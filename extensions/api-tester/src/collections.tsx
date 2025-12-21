import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Form,
  Color,
  confirmAlert,
  Alert,
  Clipboard,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import { Collection } from "./types";
import { getCollections, saveCollections } from "./storage";
import { generateId } from "./utils";
import {
  exportCollections,
  exportCollection,
  importCollections,
} from "./import-export";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

export default function Collections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCollections();
  }, []);

  async function loadCollections() {
    setIsLoading(true);
    const data = await getCollections();
    setCollections(data);
    setIsLoading(false);
  }

  async function deleteCollection(id: string) {
    if (
      await confirmAlert({
        title: "Delete Collection",
        message: "Are you sure you want to delete this collection?",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      const updated = collections.filter((c) => c.id !== id);
      await saveCollections(updated);
      setCollections(updated);
      await showToast({
        style: Toast.Style.Success,
        title: "Collection Deleted",
      });
    }
  }

  async function handleExportAll() {
    try {
      const json = exportCollections(collections);
      const filePath = join(
        homedir(),
        "Downloads",
        `collections-${Date.now()}.json`,
      );
      await writeFile(filePath, json, "utf-8");
      await showToast({
        style: Toast.Style.Success,
        title: "Collections Exported",
        message: `Saved to ${filePath}`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Export Failed",
        message: errorMessage,
      });
    }
  }

  async function handleExportSingle(collection: Collection) {
    try {
      const json = exportCollection(collection);
      const filePath = join(
        homedir(),
        "Downloads",
        `${collection.name}-${Date.now()}.json`,
      );
      await writeFile(filePath, json, "utf-8");
      await showToast({
        style: Toast.Style.Success,
        title: "Collection Exported",
        message: `Saved to ${filePath}`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Export Failed",
        message: errorMessage,
      });
    }
  }

  async function handleImport() {
    try {
      const clipboardText = await Clipboard.readText();
      if (!clipboardText) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Import Failed",
          message: "No JSON found in clipboard",
        });
        return;
      }

      const imported = importCollections(clipboardText);
      const updated = [...collections, ...imported];
      await saveCollections(updated);
      setCollections(updated);
      await showToast({
        style: Toast.Style.Success,
        title: "Collections Imported",
        message: `Imported ${imported.length} collection(s)`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Import Failed",
        message: errorMessage,
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search collections...">
      <List.EmptyView
        title="No Collections"
        description="Create your first collection to organize your API requests"
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Collection"
              icon={Icon.Plus}
              target={<CreateCollectionForm onCreated={loadCollections} />}
            />
            <ActionPanel.Section title="Import/Export">
              <Action
                title="Import from Clipboard"
                icon={Icon.Download}
                onAction={handleImport}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />

      {collections.map((collection) => (
        <List.Item
          key={collection.id}
          title={collection.name}
          subtitle={collection.description}
          accessories={[
            {
              text: `${collection.requests.length} request${collection.requests.length !== 1 ? "s" : ""}`,
            },
          ]}
          icon={{ source: Icon.Folder, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Requests"
                icon={Icon.Eye}
                target={
                  <CollectionDetail
                    collection={collection}
                    onUpdate={loadCollections}
                  />
                }
              />
              <Action.Push
                title="Edit Collection"
                icon={Icon.Pencil}
                target={
                  <EditCollectionForm
                    collection={collection}
                    onUpdated={loadCollections}
                  />
                }
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action
                title="Delete Collection"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => deleteCollection(collection.id)}
                shortcut={{ modifiers: ["ctrl"], key: "d" }}
              />
              <ActionPanel.Section title="Import/Export">
                <Action
                  title="Export This Collection"
                  icon={Icon.Upload}
                  onAction={() => handleExportSingle(collection)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                />
                <Action
                  title="Export All Collections"
                  icon={Icon.Upload}
                  onAction={handleExportAll}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                />
                <Action
                  title="Import from Clipboard"
                  icon={Icon.Download}
                  onAction={handleImport}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Push
                  title="Create Collection"
                  icon={Icon.Plus}
                  target={<CreateCollectionForm onCreated={loadCollections} />}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CollectionDetail({
  collection,
  onUpdate,
}: {
  collection: Collection;
  onUpdate: () => void;
}) {
  const { pop } = useNavigation();

  async function deleteRequest(requestId: string) {
    if (
      await confirmAlert({
        title: "Delete Request",
        message: "Are you sure you want to delete this request?",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      const collections = await getCollections();
      const updated = collections.map((c) => {
        if (c.id === collection.id) {
          return {
            ...c,
            requests: c.requests.filter((r) => r.id !== requestId),
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      });
      await saveCollections(updated);
      await showToast({ style: Toast.Style.Success, title: "Request Deleted" });
      onUpdate();
      pop();
    }
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return Color.Green;
      case "POST":
        return Color.Blue;
      case "PUT":
        return Color.Orange;
      case "DELETE":
        return Color.Red;
      case "PATCH":
        return Color.Purple;
      default:
        return Color.SecondaryText;
    }
  };

  return (
    <List searchBarPlaceholder="Search requests...">
      <List.EmptyView
        title="No Requests"
        description="This collection is empty"
        icon={Icon.Document}
      />

      {collection.requests.map((request) => (
        <List.Item
          key={request.id}
          title={request.name}
          subtitle={request.url}
          icon={{
            source: Icon.Document,
            tintColor: getMethodColor(request.method),
          }}
          accessories={[
            {
              tag: {
                value: request.method,
                color: getMethodColor(request.method),
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Send Request"
                icon={Icon.Airplane}
                onAction={async () => {
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Feature Coming Soon",
                  });
                }}
              />
              <Action
                title="Delete Request"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => deleteRequest(request.id)}
                shortcut={{ modifiers: ["ctrl"], key: "d" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CreateCollectionForm({ onCreated }: { onCreated: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string; description: string }) {
    try {
      const collections = await getCollections();
      const newCollection: Collection = {
        id: generateId(),
        name: values.name,
        description: values.description,
        requests: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveCollections([...collections, newCollection]);
      await showToast({
        style: Toast.Style.Success,
        title: "Collection Created",
      });
      onCreated();
      pop();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Create Collection",
        message: errorMessage,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Collection"
            onSubmit={handleSubmit}
            icon={Icon.Plus}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="My API Collection" />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Collection description (optional)"
      />
    </Form>
  );
}

function EditCollectionForm({
  collection,
  onUpdated,
}: {
  collection: Collection;
  onUpdated: () => void;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string; description: string }) {
    try {
      const collections = await getCollections();
      const updated = collections.map((c) => {
        if (c.id === collection.id) {
          return {
            ...c,
            name: values.name,
            description: values.description,
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      });

      await saveCollections(updated);
      await showToast({
        style: Toast.Style.Success,
        title: "Collection Updated",
      });
      onUpdated();
      pop();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Update Collection",
        message: errorMessage,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            onSubmit={handleSubmit}
            icon={Icon.Check}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My API Collection"
        defaultValue={collection.name}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Collection description (optional)"
        defaultValue={collection.description}
      />
    </Form>
  );
}
