/**
 * Form for choosing Tesla clip source folders when defaults are missing.
 *
 * @module components/folder-picker
 */

import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { logger } from "../lib/logger";
import { normalizeRoots } from "../lib/paths";

/** Props for {@link FolderPicker}. */
type FolderPickerProps = {
  readonly onFoldersSelected: (roots: string[]) => void;
  readonly onCancel?: () => void;
};

/**
 * Renders a multi-folder file picker form and submits normalized roots to the parent.
 *
 * @param props - `onFoldersSelected` called with validated directory paths.
 * @returns Raycast `Form` for source folder selection.
 */
export function FolderPicker({ onFoldersSelected, onCancel }: FolderPickerProps) {
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);

  function handleSubmit({ sourceFolders }: { sourceFolders: string[] }): void {
    const roots = normalizeRoots(sourceFolders);
    if (roots.length === 0) {
      logger.warn("Folder picker submitted with no valid folders", { sourceFolders });
      void showToast({
        style: Toast.Style.Failure,
        title: "No valid folders selected",
        message: "Choose at least one folder containing Tesla clip events.",
      });
      return;
    }

    logger.info("User selected source folders", { count: roots.length, roots });
    onFoldersSelected(roots);
  }

  return (
    <Form
      navigationTitle="Select Source Folders"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Scan Folders" icon={Icon.MagnifyingGlass} onSubmit={handleSubmit} />
          {onCancel ? <Action title="Cancel" icon={Icon.XMarkCircle} onAction={onCancel} /> : null}
        </ActionPanel>
      }
    >
      <Form.Description
        title="Tesla Clips"
        text="Choose one or more folders containing Tesla dashcam or Sentry clip events."
      />
      <Form.FilePicker
        id="sourceFolders"
        title="Source Folders"
        value={selectedFolders}
        onChange={setSelectedFolders}
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection
      />
    </Form>
  );
}
