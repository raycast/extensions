import { useRef, useState, useEffect } from "react";
import { Form, ActionPanel, Action, showToast, Toast, openExtensionPreferences, environment } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import type { Platform } from "../types";
import { client } from "../api/client";

interface TranslationFormValues {
  keyName: string;
  translationValue: string;
  description: string;
  screenshots: string[];
  isPlural: boolean;
  platform: Platform;
  assignedFile: string;
}

export interface AddTranslationFormProps {
  draftValues?: {
    keyName?: string;
    translationValue?: string;
    description?: string;
    isPlural?: boolean;
    platform?: Platform;
    assignedFile?: string;
    screenshotUrls?: string[];
  };
}

export function AddTranslationForm({ draftValues }: AddTranslationFormProps) {
  const keyNameRef = useRef<Form.TextField>(null);
  const isPluralRef = useRef<Form.Checkbox>(null);
  const translationValueRef = useRef<Form.TextArea>(null);
  const descriptionRef = useRef<Form.TextArea>(null);
  const screenshotsRef = useRef<Form.FilePicker>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloadingScreenshots, setIsDownloadingScreenshots] = useState(false);
  const [downloadedScreenshots, setDownloadedScreenshots] = useState<string[]>([]);

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

  // Download screenshots from URLs when draftValues are provided
  useEffect(() => {
    async function downloadScreenshots() {
      if (!draftValues?.screenshotUrls || draftValues.screenshotUrls.length === 0) {
        return;
      }

      console.log(`Downloading ${draftValues.screenshotUrls.length} screenshots...`);
      setIsDownloadingScreenshots(true);

      try {
        const tempDir = join(environment.supportPath, "temp-screenshots");
        if (!existsSync(tempDir)) {
          mkdirSync(tempDir, { recursive: true });
        }

        const downloadedPaths: string[] = [];

        for (let i = 0; i < draftValues.screenshotUrls.length; i++) {
          const url = draftValues.screenshotUrls[i];
          try {
            const response = await fetch(url);
            if (!response.ok) continue;

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Get file extension from URL or default to png
            const urlPath = new URL(url).pathname;
            const ext = urlPath.split(".").pop()?.toLowerCase() || "png";
            const filename = `screenshot-${i + 1}.${ext}`;
            const filepath = join(tempDir, filename);

            writeFileSync(filepath, buffer);
            downloadedPaths.push(filepath);
          } catch (error) {
            console.error(`Failed to download screenshot ${i + 1}:`, error);
          }
        }

        console.log(`Downloaded ${downloadedPaths.length} screenshots:`, downloadedPaths);
        setDownloadedScreenshots(downloadedPaths);
      } catch (error) {
        console.error("Failed to download screenshots:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Screenshot Download Failed",
          message: "Could not download original screenshots",
        });
      } finally {
        setIsDownloadingScreenshots(false);
      }
    }

    downloadScreenshots();
  }, [draftValues?.screenshotUrls]);

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

  // Only enable drafts when not using draftValues (i.e., when used as top-level command)
  const shouldEnableDrafts = !draftValues;

  return (
    <Form
      enableDrafts={shouldEnableDrafts}
      isLoading={isSubmitting || isDownloadingScreenshots}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Add Translation Key" />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="platform"
        title="Platform"
        storeValue={!draftValues?.platform}
        defaultValue={draftValues?.platform}
        info="Target platform for this key"
      >
        <Form.Dropdown.Item value="web" title="Web" />
        <Form.Dropdown.Item value="ios" title="iOS" />
        <Form.Dropdown.Item value="android" title="Android" />
        <Form.Dropdown.Item value="other" title="Other" />
      </Form.Dropdown>
      <Form.Dropdown
        id="assignedFile"
        title="Assigned to File"
        storeValue={!draftValues?.assignedFile}
        defaultValue={draftValues?.assignedFile || "none"}
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
        defaultValue={draftValues?.keyName}
        autoFocus
      />
      <Form.Checkbox
        ref={isPluralRef}
        id="isPlural"
        label="Is Plural"
        defaultValue={draftValues?.isPlural}
        info="Check if this key requires plural forms"
      />
      <Form.TextArea
        ref={translationValueRef}
        id="translationValue"
        title="Default Translation Value"
        placeholder="Enter the default translation text"
        info="The default translation value (usually English)"
        defaultValue={draftValues?.translationValue}
      />
      <Form.TextArea
        ref={descriptionRef}
        id="description"
        title="Description"
        placeholder="Enter a description for this translation key"
        info="Optional description to help translators understand the context"
        defaultValue={draftValues?.description}
      />
      <Form.FilePicker
        ref={screenshotsRef}
        id="screenshots"
        title="Screenshots"
        allowMultipleSelection
        canChooseFiles
        canChooseDirectories={false}
        value={downloadedScreenshots}
        onChange={setDownloadedScreenshots}
        info={
          downloadedScreenshots.length > 0
            ? `${downloadedScreenshots.length} screenshot(s) from original key attached`
            : "Optional screenshots to provide visual context for translators"
        }
      />
    </Form>
  );
}
