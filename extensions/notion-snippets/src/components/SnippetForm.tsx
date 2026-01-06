/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { createSnippet, updateSnippet, fetchDatabases } from "../api/notion";
import { Snippet, SnippetIndex } from "../types";

interface Props {
  snippet?: Snippet; // If provided, we are in Edit mode
  onSuccess?: (snippet?: SnippetIndex) => void;
}

export default function SnippetForm({ snippet, onSuccess }: Props) {
  const { pop } = useNavigation();
  const [databases, setDatabases] = useState<{ id: string; title: string }[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);

  const isEdit = !!snippet;

  useEffect(() => {
    async function load() {
      try {
        const dbs = await fetchDatabases();
        setDatabases(dbs);
      } catch (e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load databases",
        });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleSubmit = async (values: {
    name: string;
    content: string;
    trigger: string;
    dbId: string;
  }) => {
    if (!values.name || !values.content || (!isEdit && !values.dbId)) {
      await showToast({ style: Toast.Style.Failure, title: "Missing fields" });
      return;
    }

    const toastText = isEdit ? "Updating Snippet..." : "Creating Snippet...";
    const successText = isEdit ? "Snippet Updated" : "Snippet Created";
    const failText = isEdit
      ? "Failed to update snippet"
      : "Failed to create snippet";

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: toastText,
    });
    try {
      let resultId;
      if (isEdit && snippet) {
        await updateSnippet(snippet.id, {
          name: values.name,
          content: values.content,
          trigger: values.trigger,
        });
        resultId = snippet.id;
      } else {
        resultId = await createSnippet({
          dbId: values.dbId,
          name: values.name,
          content: values.content,
          trigger: values.trigger,
        });
      }

      toast.style = Toast.Style.Success;
      toast.title = successText;

      // OPTIMISTIC UPDATE: Pass the new data back to parent
      if (onSuccess) {
        // Construct a local snippet index to display immediately
        const optimisticSnippet: any = {
          id: resultId,
          name: values.name,
          // Store preview/length for index display
          contentPreview:
            values.content.length > 500
              ? values.content.substring(0, 500) + "..."
              : values.content,
          contentLength: values.content.length,
          trigger: values.trigger,
          databaseId: isEdit ? snippet!.databaseId : values.dbId,
          // For updates, preserve existing metadata
          usageCount: isEdit ? snippet!.usageCount : 0,
          lastUsed: isEdit ? snippet!.lastUsed : new Date(),
        };
        onSuccess(optimisticSnippet);
      }

      pop();
    } catch (e: any) {
      toast.style = Toast.Style.Failure;
      toast.title = failText;
      toast.message = e.message || String(e);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEdit ? "Update Snippet" : "Create Snippet"}
            icon={isEdit ? Icon.Pencil : Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Snippet name (e.g. My Snippet)"
        defaultValue={snippet?.name}
      />
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Snippet content. Use {{placeholder}} or {date}."
        defaultValue={snippet?.content}
      />
      <Form.TextField
        id="trigger"
        title="Trigger"
        placeholder="Keyword to trigger (optional)"
        defaultValue={snippet?.trigger}
      />
      {!isEdit && (
        <>
          <Form.Separator />
          <Form.Dropdown
            id="dbId"
            title="Destination Database"
            defaultValue={databases[0]?.id}
          >
            {databases.map((db) => (
              <Form.Dropdown.Item key={db.id} value={db.id} title={db.title} />
            ))}
          </Form.Dropdown>
        </>
      )}
    </Form>
  );
}
