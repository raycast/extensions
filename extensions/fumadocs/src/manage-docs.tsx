import { useEffect, useState, useCallback } from "react";
import {
  List,
  Action,
  ActionPanel,
  Icon,
  Form,
  useNavigation,
  showToast,
  Toast,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { StoredDocsConfig } from "./types";
import { getAllDocs, addDoc, removeDoc, toggleDocVisibility, resetToDefaults } from "./storage";

function AddDocForm({ onAdd }: { onAdd: () => void }) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();

  const handleSubmit = async (values: { name: string; url: string }) => {
    if (!values.name.trim()) {
      setNameError("Name is required");
      return;
    }

    if (!values.url.trim()) {
      setUrlError("URL is required");
      return;
    }

    try {
      new URL(values.url);
    } catch {
      setUrlError("Please enter a valid URL");
      return;
    }

    const existingDocs = await getAllDocs();
    if (existingDocs.some((doc) => doc.name === values.name.trim())) {
      setNameError("A doc with this name already exists");
      return;
    }

    try {
      await addDoc(values.name.trim(), values.url.trim());
      await showToast({
        style: Toast.Style.Success,
        title: "Documentation Added",
        message: `${values.name} has been added`,
      });
      onAdd();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add",
        message: String(error),
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Documentation" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My Documentation"
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com/docs"
        error={urlError}
        onChange={() => setUrlError(undefined)}
      />
    </Form>
  );
}

export default function Command() {
  const [docs, setDocs] = useState<StoredDocsConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const loadDocs = useCallback(async () => {
    setIsLoading(true);
    try {
      const allDocs = await getAllDocs();
      setDocs(allDocs);
    } catch (error) {
      console.error("Failed to load docs:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const handleToggleVisibility = async (name: string) => {
    await toggleDocVisibility(name);
    await loadDocs();
  };

  const handleDelete = async (doc: StoredDocsConfig) => {
    const confirmed = await confirmAlert({
      title: "Delete Documentation",
      message: `Are you sure you want to delete "${doc.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await removeDoc(doc.name);
      await showToast({
        style: Toast.Style.Success,
        title: "Documentation Deleted",
        message: `${doc.name} has been deleted`,
      });
      await loadDocs();
    }
  };

  const handleReset = async () => {
    const confirmed = await confirmAlert({
      title: "Reset to Defaults",
      message: "This will remove all custom documentation and restore the default list. Are you sure?",
      primaryAction: {
        title: "Reset",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await resetToDefaults();
      await showToast({
        style: Toast.Style.Success,
        title: "Reset Complete",
        message: "Documentation list has been reset to defaults",
      });
      await loadDocs();
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search documentation sources...">
      {docs.map((doc) => (
        <List.Item
          key={doc.name}
          title={doc.name}
          subtitle={doc.url}
          icon={doc.isVisible ? Icon.Eye : Icon.EyeDisabled}
          accessories={[
            {
              tag: doc.isVisible ? "Visible" : "Hidden",
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title={doc.isVisible ? "Hide Documentation" : "Show Documentation"}
                  icon={doc.isVisible ? Icon.EyeDisabled : Icon.Eye}
                  onAction={() => handleToggleVisibility(doc.name)}
                />
                <Action.OpenInBrowser url={doc.url} title="Open in Browser" />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Add New Documentation"
                  icon={Icon.Plus}
                  shortcut={{ macOS: { modifiers: ["cmd"], key: "n" }, Windows: { modifiers: ["ctrl"], key: "n" } }}
                  onAction={() => push(<AddDocForm onAdd={loadDocs} />)}
                />
                <Action
                  title="Delete Documentation"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
                  onAction={() => handleDelete(doc)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Reset to Defaults"
                  icon={Icon.RotateAntiClockwise}
                  style={Action.Style.Destructive}
                  onAction={handleReset}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && docs.length === 0 && (
        <List.EmptyView
          title="No Documentation Sources"
          description="Add a new documentation source to get started"
          actions={
            <ActionPanel>
              <Action
                title="Add New Documentation"
                icon={Icon.Plus}
                onAction={() => push(<AddDocForm onAdd={loadDocs} />)}
              />
              <Action title="Reset to Defaults" icon={Icon.RotateAntiClockwise} onAction={handleReset} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
