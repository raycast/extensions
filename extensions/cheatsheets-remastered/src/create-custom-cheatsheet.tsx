import React from "react";
import { Form, ActionPanel, Action, Icon, showToast, Toast, LocalStorage, useNavigation } from "@raycast/api";
import { useState } from "react";
import Service from "./service";
import { showFailureToast } from "@raycast/utils";

type CreateFormValues = {
  title: string;
  content: string;
  tags?: string;
  description?: string;
  icon?: string;
};

// Custom hook for draft persistence
function useDraftPersistence(key: string, defaultValue: string) {
  const [value, setValue] = useState(defaultValue);

  React.useEffect(() => {
    // Load draft from storage
    LocalStorage.getItem<string>(key).then((stored) => {
      if (stored && stored !== defaultValue) {
        setValue(stored);
      }
    });
  }, [key, defaultValue]);

  const updateValue = (newValue: string) => {
    setValue(newValue);
    // Save to storage
    LocalStorage.setItem(key, newValue);
  };

  const clearDraft = () => {
    LocalStorage.removeItem(key);
    setValue(defaultValue);
  };

  return { value, updateValue, clearDraft };
}

export function CreateCustomCheatsheet({ onCreated }: { onCreated?: () => void }) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const {
    value: title,
    updateValue: updateTitle,
    clearDraft: clearTitleDraft,
  } = useDraftPersistence("create-custom-sheet-title", "");

  const {
    value: content,
    updateValue: updateContent,
    clearDraft: clearContentDraft,
  } = useDraftPersistence("create-custom-sheet-content", "");

  const {
    value: tags,
    updateValue: updateTags,
    clearDraft: clearTagsDraft,
  } = useDraftPersistence("create-custom-sheet-tags", "");

  const {
    value: description,
    updateValue: updateDescription,
    clearDraft: clearDescriptionDraft,
  } = useDraftPersistence("create-custom-sheet-description", "");
  const {
    value: icon,
    updateValue: updateIcon,
    clearDraft: clearIconDraft,
  } = useDraftPersistence("create-custom-sheet-icon", "");

  const handleSubmit = async (values: CreateFormValues) => {
    try {
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

      await Service.createCustomCheatsheet(values.title, values.content, tagsArray, values.description, values.icon);

      // Clear drafts after successful submission
      clearTitleDraft();
      clearContentDraft();
      clearTagsDraft();
      clearDescriptionDraft();
      clearIconDraft();

      if (onCreated) {
        onCreated();
      }
      pop();

      showToast({
        style: Toast.Style.Success,
        title: "Created",
        message: `"${values.title}" has been added to your custom cheatsheets`,
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to create cheatsheet" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Custom Cheatsheet" onSubmit={handleSubmit} icon={Icon.Document} />
          <Action
            title="Reset Draft"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => {
              clearTitleDraft();
              clearContentDraft();
              clearTagsDraft();
              clearDescriptionDraft();
              showToast({ style: Toast.Style.Success, title: "Draft Cleared" });
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
      <Form.TextField
        id="icon"
        title="Icon (Optional)"
        placeholder="Raycast Icon key (e.g., Code, Terminal, Cloud)"
        value={icon}
        onChange={updateIcon}
      />
    </Form>
  );
}

export default CreateCustomCheatsheet;
