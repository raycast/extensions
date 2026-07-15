import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useDependencyCheck } from "./hooks/use-dependency-check";
import { expandPath, runQmdRaw, validateCollectionPath } from "./utils/qmd";

const COLLECTION_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

interface FormValues {
  name: string;
  path: string[];
  context: string;
  showAdvanced: boolean;
  mask: string;
}

export default function Command() {
  const { isLoading: isDepsLoading, isReady } = useDependencyCheck();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pathError, setPathError] = useState<string | undefined>();
  const [nameError, setNameError] = useState<string | undefined>();
  const { pop } = useNavigation();

  const validatePath = (value: string[] | undefined) => {
    if (!value || value.length === 0) {
      setPathError("Path is required");
      return false;
    }
    if (!validateCollectionPath(value[0])) {
      setPathError("Directory does not exist");
      return false;
    }
    setPathError(undefined);
    return true;
  };

  const validateName = (value: string | undefined) => {
    if (!value?.trim()) {
      setNameError("Name is required");
      return false;
    }
    if (!COLLECTION_NAME_PATTERN.test(value)) {
      setNameError("Name can only contain letters, numbers, hyphens, and underscores");
      return false;
    }
    setNameError(undefined);
    return true;
  };

  async function handleSubmit(values: FormValues) {
    if (!(validateName(values.name) && validatePath(values.path))) {
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding collection...",
    });

    try {
      // Build the add command
      const selectedPath = values.path[0];
      const addArgs = ["collection", "add", expandPath(selectedPath), "--name", values.name.trim()];

      // Add custom mask if different from default
      if (values.mask && values.mask !== "**/*.md") {
        addArgs.push("--mask", values.mask);
      }

      const addResult = await runQmdRaw(addArgs);

      if (!addResult.success) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to add collection";
        toast.message = addResult.error || "Unknown error";
        setIsSubmitting(false);
        return;
      }

      // Add context if provided
      if (values.context?.trim()) {
        const contextPath = `qmd://${values.name.trim()}`;
        const contextResult = await runQmdRaw(["context", "add", contextPath, values.context.trim()]);

        if (!contextResult.success) {
          // Collection was added but context failed - still show partial success
          toast.style = Toast.Style.Success;
          toast.title = "Collection added";
          toast.message = "Warning: Failed to add context description";
          setIsSubmitting(false);
          pop();
          return;
        }
      }

      toast.style = Toast.Style.Success;
      toast.title = "Collection added";
      toast.message = values.name;

      // Offer to generate embeddings
      await showToast({
        style: Toast.Style.Success,
        title: "Collection added successfully",
        message: "Run 'Generate Embeddings' to enable semantic search",
        primaryAction: {
          title: "Generate Embeddings",
          onAction: async (toast) => {
            toast.hide();
            // Trigger embed via importing the generate-embeddings command
            // For now, just show instructions
            await showToast({
              style: Toast.Style.Animated,
              title: "Starting embedding generation...",
            });
            const embedResult = await runQmdRaw(["embed", "-c", values.name.trim()], {
              timeout: 300_000,
            });
            if (embedResult.success) {
              await showToast({
                style: Toast.Style.Success,
                title: "Embeddings generated",
              });
            } else {
              await showToast({
                style: Toast.Style.Failure,
                title: "Embedding failed",
                message: embedResult.error,
              });
            }
          },
        },
      });

      setIsSubmitting(false);
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      toast.message = error instanceof Error ? error.message : "Unknown error";
      setIsSubmitting(false);
    }
  }

  if (isDepsLoading) {
    return (
      <Form>
        <Form.Description text="Checking dependencies..." />
      </Form>
    );
  }

  if (!isReady) {
    return (
      <Form>
        <Form.Description text="Please install the required dependencies to use QMD." />
      </Form>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} onSubmit={handleSubmit} title="Add Collection" />
        </ActionPanel>
      }
      isLoading={isSubmitting}
    >
      <Form.TextField
        error={nameError}
        id="name"
        info="Identifier for this collection (letters, numbers, hyphens, underscores)"
        onBlur={(event) => validateName(event.target.value)}
        onChange={(value) => validateName(value)}
        placeholder="notes"
        title="Name"
      />

      <Form.FilePicker
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        error={pathError}
        id="path"
        info="Directory containing markdown files"
        onChange={(value) => validatePath(value)}
        title="Path"
      />

      <Form.TextArea
        id="context"
        info="Description to help improve search relevance"
        placeholder="Personal notes and ideas about various topics..."
        title="Context (Optional)"
      />

      <Form.Separator />

      <Form.Checkbox id="showAdvanced" label="Show Advanced Options" onChange={setShowAdvanced} value={showAdvanced} />

      {showAdvanced && (
        <Form.TextField
          defaultValue="**/*.md"
          id="mask"
          info="File pattern to index (e.g., **/*.md, docs/**/*.markdown)"
          placeholder="**/*.md"
          title="Glob Mask"
        />
      )}
    </Form>
  );
}
