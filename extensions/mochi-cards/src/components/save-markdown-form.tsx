import { homedir } from "node:os";
import { join } from "node:path";

import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";

import {
  markdownFileExists,
  MarkdownFileExistsError,
  sanitizeMarkdownFilename,
  saveMarkdownFile,
} from "../services/markdown-file";

type SaveMarkdownFormProps = {
  readonly markdown: string;
  readonly suggestedName: string;
};

export function SaveMarkdownForm({ markdown, suggestedName }: SaveMarkdownFormProps) {
  const { pop } = useNavigation();
  const [directories, setDirectories] = useState<readonly string[]>([join(homedir(), "Downloads")]);
  const [filename, setFilename] = useState(sanitizeMarkdownFilename(suggestedName));
  const [directoryError, setDirectoryError] = useState<string>();
  const [filenameError, setFilenameError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  async function save(): Promise<void> {
    const directory = directories[0];
    setDirectoryError(directory ? undefined : "Choose a destination directory");
    setFilenameError(filename.trim().length > 0 ? undefined : "Enter a filename");
    if (!directory || filename.trim().length === 0) {
      return;
    }

    setIsSaving(true);
    try {
      let overwrite = false;
      if (await markdownFileExists(directory, filename)) {
        overwrite = await confirmAlert({
          icon: Icon.Warning,
          title: "Replace existing file?",
          message: sanitizeMarkdownFilename(filename),
          primaryAction: { title: "Replace", style: Alert.ActionStyle.Destructive },
        });
        if (!overwrite) {
          return;
        }
      }

      const path = await saveMarkdownFile(directory, filename, markdown, overwrite);
      await showToast({ style: Toast.Style.Success, title: "Markdown saved", message: path });
      const reveal = await confirmAlert({
        icon: Icon.Finder,
        title: "Show the saved file in Finder?",
        primaryAction: { title: "Show in Finder" },
        dismissAction: { title: "Done" },
      });
      if (reveal) {
        await showInFinder(path);
      } else {
        pop();
      }
    } catch (error: unknown) {
      const message = error instanceof MarkdownFileExistsError ? error.message : errorMessage(error);
      await showToast({ style: Toast.Style.Failure, title: "Could not save Markdown", message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form
      isLoading={isSaving}
      navigationTitle="Save Markdown File"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Markdown" icon={Icon.SaveDocument} onSubmit={save} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="directory"
        title="Directory"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        value={[...directories]}
        error={directoryError}
        onChange={setDirectories}
      />
      <Form.TextField
        id="filename"
        title="Filename"
        placeholder="mochi-card.md"
        value={filename}
        error={filenameError}
        onChange={(value) => {
          setFilename(value);
          setFilenameError(undefined);
        }}
      />
    </Form>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}
