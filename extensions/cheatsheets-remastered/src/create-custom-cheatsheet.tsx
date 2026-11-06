import React from "react";
import { Form, confirmAlert, Alert, ActionPanel, Action, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { showFailureToast } from "@raycast/utils";
import Service from "./service";

type CreateFormValues = {
  title: string;
  content: string;
  tags?: string;
  description?: string;
};

import { useDraftPersistence } from "./use-draft";

export function CreateCustomCheatsheet({ onCreated }: { onCreated?: () => void }) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const {
    value: title,
    isReady: titleReady,
    updateValue: updateTitle,
    clearDraft: clearTitleDraft,
  } = useDraftPersistence<string>("create-custom-sheet-title", "");

  const {
    value: content,
    isReady: contentReady,
    updateValue: updateContent,
    clearDraft: clearContentDraft,
  } = useDraftPersistence<string>("create-custom-sheet-content", "");

  const {
    value: tags,
    isReady: tagsReady,
    updateValue: updateTags,
    clearDraft: clearTagsDraft,
  } = useDraftPersistence<string>("create-custom-sheet-tags", "");

  const {
    value: description,
    isReady: descriptionReady,
    updateValue: updateDescription,
    clearDraft: clearDescriptionDraft,
  } = useDraftPersistence<string>("create-custom-sheet-description", "");

  const handleSubmit = async (values: CreateFormValues) => {
    try {
      if (!(titleReady && contentReady && tagsReady && descriptionReady))
        throw new Error("Wait for saved drafts to load. If loading failed, preserve your text and reopen the form.");
      setIsSubmitting(true);
      setShowErrors(true);

      // Client-side validation: avoid triggering a failing API call
      if (!values.title?.trim() || !values.content?.trim()) {
        setIsSubmitting(false);
        return;
      }

      const tagsArray = values.tags
        ? values.tags
            .split(",")
            .map((tag: string) => tag.trim())
            .filter(Boolean)
        : [];

      await Service.createCustomCheatsheet(values.title, values.content, tagsArray, values.description);

      // Clear drafts after successful submission
      const draftsCleared = (
        await Promise.all([clearTitleDraft(), clearContentDraft(), clearTagsDraft(), clearDescriptionDraft()])
      ).every(Boolean);

      if (onCreated) {
        onCreated();
      }
      pop();

      showToast({
        style: Toast.Style.Success,
        title: "Created",
        message: draftsCleared
          ? `"${values.title}" has been added to your custom cheatsheets`
          : "Sheet saved. Some drafts could not be cleared; copy any newer draft before resetting it.",
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to create cheatsheet" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting || !(titleReady && contentReady && tagsReady && descriptionReady)}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Custom Cheatsheet" onSubmit={handleSubmit} icon={Icon.Document} />
          <Action
            title="Reset Draft"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={async () => {
              if (
                !(await confirmAlert({
                  title: "Discard Saved Draft?",
                  message: "This removes the saved draft for this form.",
                  primaryAction: { title: "Discard", style: Alert.ActionStyle.Destructive },
                }))
              )
                return;
              const draftsCleared = (
                await Promise.all([clearTitleDraft(), clearContentDraft(), clearTagsDraft(), clearDescriptionDraft()])
              ).every(Boolean);
              if (draftsCleared) showToast({ style: Toast.Style.Success, title: "Draft Cleared" });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text="Create a new custom cheatsheet that you can access offline and organize with tags."
        title="New Custom Cheatsheet"
      />

      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter cheatsheet title (e.g., 'My Git Workflow')"
        value={title}
        onChange={updateTitle}
        error={showErrors && !title.trim() ? "Title is required" : undefined}
      />

      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Enter cheatsheet content (Markdown supported)"
        value={content}
        onChange={updateContent}
        error={showErrors && !content.trim() ? "Content is required" : undefined}
      />

      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="Enter tags separated by commas (e.g., git, workflow, tips)"
        value={tags}
        onChange={updateTags}
      />

      <Form.TextField
        id="description"
        title="Description"
        placeholder="Enter optional description"
        value={description}
        onChange={updateDescription}
      />
    </Form>
  );
}

export default CreateCustomCheatsheet;
