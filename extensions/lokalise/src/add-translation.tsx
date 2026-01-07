import { useRef, useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { client } from "./api/client";

interface TranslationFormValues {
  keyName: string;
  translationValue: string;
  description: string;
  screenshots: string[];
  isPlural: boolean;
  platform: string;
  assignedFile: string;
}

export default function Command() {
  const keyNameRef = useRef<Form.TextField>(null);
  const isPluralRef = useRef<Form.Checkbox>(null);
  const translationValueRef = useRef<Form.TextArea>(null);
  const descriptionRef = useRef<Form.TextArea>(null);
  const screenshotsRef = useRef<Form.FilePicker>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: files, isLoading: isLoadingFiles } = useCachedPromise(
    async () => {
      return await client.listFiles();
    },
    [],
    {
      initialData: [],
      onError: () => {
        // Silently fail - files dropdown will just be empty
      },
    },
  );

  async function handleSubmit(values: TranslationFormValues) {
    setIsSubmitting(true);

    try {
      await client.createTranslationKey({
        keyName: values.keyName,
        translationValue: values.translationValue,
        description: values.description,
        screenshotPaths: values.screenshots,
        isPlural: values.isPlural,
        platform: values.platform,
        assignedFile: values.assignedFile,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: `Key "${values.keyName}" added successfully`,
      });

      // Reset all fields except platform and assignedFile
      keyNameRef.current?.reset();
      isPluralRef.current?.reset();
      translationValueRef.current?.reset();
      descriptionRef.current?.reset();
      screenshotsRef.current?.reset();

      keyNameRef.current?.focus();
    } catch (error: unknown) {
      if (error instanceof Error && (error.message.includes("not configured") || error.message.includes("API token"))) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Missing Configuration",
          message: "Please set your API token and project ID in preferences",
        });
        openExtensionPreferences();
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: error instanceof Error ? error.message : "Failed to add translation key",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      enableDrafts
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Add Translation Key" />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="platform" title="Platform" storeValue info="Target platform for this key">
        <Form.Dropdown.Item value="web" title="Web" />
        <Form.Dropdown.Item value="ios" title="iOS" />
        <Form.Dropdown.Item value="android" title="Android" />
        <Form.Dropdown.Item value="other" title="Other" />
      </Form.Dropdown>
      <Form.Dropdown
        id="assignedFile"
        title="Assigned to File"
        storeValue
        isLoading={isLoadingFiles}
        info="Optional: Assign this key to a specific file. Select 'Don't assign to file' to skip file assignment."
      >
        <Form.Dropdown.Item value="none" title="Don't assign to file" />
        {files.map((file) => (
          <Form.Dropdown.Item key={file.fileId} value={file.filename} title={file.filename} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        ref={keyNameRef}
        id="keyName"
        title="Key Name"
        placeholder="e.g., common.button.save"
        info="The translation key identifier (use dots for nesting)"
        autoFocus
      />
      <Form.Checkbox
        ref={isPluralRef}
        id="isPlural"
        label="Is Plural"
        defaultValue={false}
        info="Check if this key requires plural forms"
      />
      <Form.TextArea
        ref={translationValueRef}
        id="translationValue"
        title="Default Translation Value"
        placeholder="Enter the default translation text"
        info="The default translation value (usually English)"
      />
      <Form.TextArea
        ref={descriptionRef}
        id="description"
        title="Description"
        placeholder="Enter a description for this translation key"
        info="Optional description to help translators understand the context"
      />
      <Form.FilePicker
        ref={screenshotsRef}
        id="screenshots"
        title="Screenshots"
        allowMultipleSelection
        canChooseFiles
        canChooseDirectories={false}
        info="Optional screenshots to provide visual context for translators"
      />
    </Form>
  );
}
