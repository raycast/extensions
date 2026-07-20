import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { useDependencyCheck } from "./hooks/use-dependency-check";
import { getContexts, runQmdRaw } from "./utils/qmd";

export default function Command() {
  const { isLoading: isDepsLoading, isReady } = useDependencyCheck();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pathError, setPathError] = useState<string | undefined>();

  const validatePath = (value: string | undefined) => {
    if (!value?.trim()) {
      setPathError("Path is required");
      return false;
    }
    setPathError(undefined);
    return true;
  };

  const handleSubmit = async (values: { path: string; description: string }) => {
    if (!validatePath(values.path)) {
      return;
    }
    if (!values.description.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Description is required",
      });
      return;
    }

    const pathTrimmed = values.path.trim();

    // Check if context already exists
    const existingContexts = await getContexts();
    if (existingContexts.success && existingContexts.data) {
      const existing = existingContexts.data.find((c) => c.path === pathTrimmed);
      if (existing) {
        const confirmed = await confirmAlert({
          title: "Context Already Exists",
          message: `A context already exists for "${pathTrimmed}". Do you want to replace it?`,
          primaryAction: {
            title: "Replace",
            style: Alert.ActionStyle.Destructive,
          },
        });

        if (!confirmed) {
          return;
        }

        // Remove existing context first
        await runQmdRaw(["context", "rm", pathTrimmed]);
      }
    }

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding context...",
    });

    const result = await runQmdRaw(["context", "add", pathTrimmed, values.description.trim()]);

    if (result.success) {
      toast.style = Toast.Style.Success;
      toast.title = "Context added";
      toast.message = pathTrimmed;
      await popToRoot();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to add context";
      toast.message = result.error;
    }

    setIsSubmitting(false);
  };

  if (isDepsLoading) {
    return (
      <Form isLoading={true}>
        <Form.Description text="Checking dependencies..." />
      </Form>
    );
  }

  if (!isReady) {
    return (
      <Form>
        <Form.Description text="Please install the required dependencies to use QMD" />
      </Form>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} onSubmit={handleSubmit} title="Add Context" />
        </ActionPanel>
      }
      isLoading={isSubmitting}
    >
      <Form.TextField
        error={pathError}
        id="path"
        info="Use qmd://collection for collection-level context, or qmd://collection/path for document-level context"
        onChange={(value) => validatePath(value)}
        placeholder="qmd://collection-name or qmd://collection/path/to/file.md"
        title="Path"
      />
      <Form.TextArea
        id="description"
        info="This context will be used to enhance search results for the specified path"
        placeholder="Description to help improve search relevance..."
        title="Description"
      />
    </Form>
  );
}
