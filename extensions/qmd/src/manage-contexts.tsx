import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  LaunchType,
  List,
  launchCommand,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { useDependencyCheck } from "./hooks/use-dependency-check";
import type { QmdContext } from "./types";
import { contextsLogger } from "./utils/logger";
import { getContexts, runQmdRaw } from "./utils/qmd";

export default function Command() {
  const { isLoading: isDepsLoading, isReady } = useDependencyCheck();
  const [contexts, setContexts] = useState<QmdContext[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadContexts = useCallback(async () => {
    if (!isReady) {
      return;
    }

    contextsLogger.info("Loading contexts");
    setIsLoading(true);
    const result = await getContexts();

    if (result.success && result.data) {
      setContexts(result.data);
      contextsLogger.info("Contexts loaded", { count: result.data.length });
    } else {
      contextsLogger.warn("Failed to load contexts", { error: result.error });
      setContexts([]);
    }
    setIsLoading(false);
  }, [isReady]);

  useEffect(() => {
    loadContexts();
  }, [loadContexts]);

  if (isDepsLoading) {
    return <List isLoading={true} searchBarPlaceholder="Checking dependencies..." />;
  }

  if (!isReady) {
    return (
      <List>
        <List.EmptyView
          description="Please install the required dependencies to use QMD"
          icon={Icon.Warning}
          title="Dependencies Required"
        />
      </List>
    );
  }

  const handleAddContext = async () => {
    await launchCommand({
      name: "add-context",
      type: LaunchType.UserInitiated,
    });
  };

  return (
    <List
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Plus}
            onAction={handleAddContext}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            title="Add Context"
          />
          <Action
            icon={Icon.ArrowClockwise}
            onAction={loadContexts}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            title="Refresh"
          />
        </ActionPanel>
      }
      isLoading={isLoading}
      searchBarPlaceholder="Search contexts..."
    >
      {contexts.length === 0 && !isLoading && (
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action icon={Icon.Plus} onAction={handleAddContext} title="Add Context" />
            </ActionPanel>
          }
          description="Add context descriptions to improve search relevance"
          icon={Icon.Text}
          title="No Contexts"
        />
      )}

      {contexts.map((context, index) => (
        <ContextItem context={context} key={`${context.path}-${index}`} onRefresh={loadContexts} />
      ))}
    </List>
  );
}

interface ContextItemProps {
  context: QmdContext;
  onRefresh: () => Promise<void>;
}

function ContextItem({ context, onRefresh }: ContextItemProps) {
  const handleAddContext = async () => {
    await launchCommand({
      name: "add-context",
      type: LaunchType.UserInitiated,
    });
  };

  const handleRemove = async () => {
    const confirmed = await confirmAlert({
      title: "Remove Context?",
      message: `This will remove the context description for "${context.path}".`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    contextsLogger.info("Removing context", { path: context.path });
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Removing context...",
    });

    const result = await runQmdRaw(["context", "rm", context.path]);

    // Treat "No context found" as success - the context is gone either way
    const isNotFoundError = result.error?.includes("No context found");

    if (result.success || isNotFoundError) {
      contextsLogger.info("Context removed", { path: context.path });
      toast.style = Toast.Style.Success;
      toast.title = "Context removed";
      await onRefresh();
    } else {
      contextsLogger.error("Remove failed", {
        path: context.path,
        error: result.error,
      });
      toast.style = Toast.Style.Failure;
      toast.title = "Remove failed";
      toast.message = result.error;
    }
  };

  return (
    <List.Item
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.Pencil}
              target={<EditContextForm context={context} onEdit={onRefresh} />}
              title="Edit"
            />
            <Action.CopyToClipboard content={context.path} title="Copy Path" />
            <Action.CopyToClipboard
              content={context.description}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              title="Copy Description"
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              icon={Icon.Plus}
              onAction={handleAddContext}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              title="Add Context"
            />
            <Action
              icon={Icon.ArrowClockwise}
              onAction={onRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              title="Refresh"
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              icon={Icon.Trash}
              onAction={handleRemove}
              shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
              style={Action.Style.Destructive}
              title="Remove Context"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      icon={context.path.startsWith("qmd://") ? Icon.Link : Icon.Document}
      subtitle={context.description}
      title={context.path}
    />
  );
}

interface EditContextFormProps {
  context: QmdContext;
  onEdit: () => Promise<void>;
}

function EditContextForm({ context, onEdit }: EditContextFormProps) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: { description: string }) => {
    if (!values.description.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Description is required",
      });
      return;
    }

    contextsLogger.info("Updating context", { path: context.path });
    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating context...",
    });

    // QMD doesn't have an edit command, so we remove and re-add
    const removeResult = await runQmdRaw(["context", "rm", context.path]);

    // Treat "No context found" as success - we're replacing it anyway
    const isNotFoundError = removeResult.error?.includes("No context found");

    if (!(removeResult.success || isNotFoundError)) {
      contextsLogger.error("Failed to remove context during update", {
        error: removeResult.error,
      });
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update context";
      toast.message = removeResult.error;
      setIsSubmitting(false);
      return;
    }

    const addResult = await runQmdRaw(["context", "add", context.path, values.description.trim()]);

    if (addResult.success) {
      contextsLogger.info("Context updated", { path: context.path });
      toast.style = Toast.Style.Success;
      toast.title = "Context updated";
      await onEdit();
      pop();
    } else {
      contextsLogger.error("Failed to add context during update", {
        error: addResult.error,
      });
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update context";
      toast.message = addResult.error;
    }

    setIsSubmitting(false);
  };

  const handleRemove = async () => {
    const confirmed = await confirmAlert({
      title: "Remove Context?",
      message: `This will remove the context description for "${context.path}".`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    contextsLogger.info("Removing context from edit form", {
      path: context.path,
    });
    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Removing context...",
    });

    const result = await runQmdRaw(["context", "rm", context.path]);

    // Treat "No context found" as success - the context is gone either way
    const isNotFoundError = result.error?.includes("No context found");

    if (result.success || isNotFoundError) {
      contextsLogger.info("Context removed", { path: context.path });
      toast.style = Toast.Style.Success;
      toast.title = "Context removed";
      await onEdit();
      pop();
    } else {
      contextsLogger.error("Remove failed", {
        path: context.path,
        error: result.error,
      });
      toast.style = Toast.Style.Failure;
      toast.title = "Remove failed";
      toast.message = result.error;
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm onSubmit={handleSubmit} title="Update Context" />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              icon={Icon.Trash}
              onAction={handleRemove}
              shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
              style={Action.Style.Destructive}
              title="Remove Context"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      isLoading={isSubmitting}
    >
      <Form.Description text={context.path} title="Path" />
      <Form.TextArea defaultValue={context.description} id="description" title="Description" />
    </Form>
  );
}
