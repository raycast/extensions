import { ActionPanel, Action, Form, showToast, Toast, popToRoot, open } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useState, useEffect } from "react";
import { Instance } from "./queryInstances";
import { OutlineApi, Collection } from "./api/OutlineApi";
import EmptyList from "./EmptyList";
import { List } from "@raycast/api";

export default function Command() {
  const { value: instances } = useLocalStorage<Instance[]>("instances");
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!instances || instances.length === 0) {
      setIsLoading(false);
      return;
    }

    // If only one instance, select it automatically and fetch collections
    if (instances.length === 1) {
      setSelectedInstance(instances[0]);
      fetchCollections(instances[0]);
    } else {
      setIsLoading(false);
    }
  }, [instances]);

  async function fetchCollections(instance: Instance) {
    setIsLoading(true);
    try {
      const api = new OutlineApi(instance);
      const data = await api.listCollections();
      setCollections(data);
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

  async function handleSubmit(values: { title: string; collectionId: string; text: string }) {
    if (!selectedInstance) return;

    if (!values.title || !values.collectionId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing required fields",
        message: "Please provide a title and select a collection",
      });
      return;
    }

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Creating document...",
      });

      const api = new OutlineApi(selectedInstance);
      const document = await api.createDocument(values.title, values.collectionId, values.text);

      await showToast({
        style: Toast.Style.Success,
        title: "Document created",
        message: values.title,
      });

      // Open the document in browser
      const url = api.getDocumentUrl(document);
      await open(url);

      popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create document",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!instances || instances.length === 0) {
    return (
      <List>
        <EmptyList />
      </List>
    );
  }

  // If multiple instances and none selected, show instance selector
  if (!selectedInstance && instances.length > 1) {
    return (
      <Form
        isLoading={isLoading}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Continue"
              onSubmit={(values: { instanceName: string }) => {
                const instance = instances.find((i) => i.name === values.instanceName);
                if (instance) {
                  setSelectedInstance(instance);
                  fetchCollections(instance);
                }
              }}
            />
          </ActionPanel>
        }
      >
        <Form.Dropdown id="instanceName" title="Instance" placeholder="Select an instance">
          {instances.map((instance) => (
            <Form.Dropdown.Item key={instance.name} value={instance.name} title={instance.name} />
          ))}
        </Form.Dropdown>
      </Form>
    );
  }

  // Show the create document form
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Document" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Enter document title" />
      <Form.Dropdown id="collectionId" title="Collection" placeholder="Select a collection">
        {collections.map((collection) => (
          <Form.Dropdown.Item
            key={collection.id}
            value={collection.id}
            title={collection.name}
            icon={collection.icon}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea id="text" title="Content (Optional)" placeholder="Enter initial content in Markdown format" />
    </Form>
  );
}
