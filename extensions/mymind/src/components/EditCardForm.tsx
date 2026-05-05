import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { loadCardMarkdown, MyMindObject, updateObject, updateObjectContent } from "../api";

interface FormValues {
  title: string;
  summary: string;
  content: string;
}

export function EditCardForm({ object, onSaved }: { object: MyMindObject; onSaved?: () => void }) {
  const { pop } = useNavigation();
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [summaryDraft, setSummaryDraft] = useState<string | null>(null);
  const [contentDraft, setContentDraft] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    isLoading,
    data: initialContent = "",
    error: loadError,
  } = useCachedPromise((id: string) => loadCardMarkdown(id), [object.id]);

  useEffect(() => {
    if (loadError) {
      showFailureToast(loadError, { title: "Couldn't load existing content" });
    }
  }, [loadError]);

  const initialTitle = object.title || "";
  const initialSummary = object.summary ?? "";
  const title = titleDraft ?? initialTitle;
  const summary = summaryDraft ?? initialSummary;
  const content = contentDraft ?? initialContent;

  const handleSubmit = async (values: FormValues) => {
    setSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving…" });
    try {
      const fields: Parameters<typeof updateObject>[1] = {};
      if (values.title !== initialTitle) fields.title = values.title;
      if (values.summary !== initialSummary) fields.summary = values.summary || null;

      const operations: Promise<unknown>[] = [];
      if (Object.keys(fields).length > 0) operations.push(updateObject(object.id, fields));
      if (values.content !== initialContent) {
        operations.push(updateObjectContent(object.id, values.content, "markdown"));
      }
      if (operations.length === 0) {
        toast.style = Toast.Style.Success;
        toast.title = "No changes";
        pop();
        return;
      }
      await Promise.all(operations);
      toast.style = Toast.Style.Success;
      toast.title = "Saved";
      onSaved?.();
      pop();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Failed to save" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isLoading || submitting}
      navigationTitle={object.title ? `Edit “${object.title}”` : "Edit Card"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" value={title} onChange={setTitleDraft} />
      <Form.TextArea
        id="summary"
        title="Summary"
        placeholder="Short TLDR shown above the body"
        value={summary}
        onChange={setSummaryDraft}
      />
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Markdown…"
        enableMarkdown
        value={content}
        onChange={setContentDraft}
      />
    </Form>
  );
}
