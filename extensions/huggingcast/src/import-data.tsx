/**
 * "Import Data" Command
 *
 * Enables users to import all of their questions, conversations,
 * and models from a specified JSON file.
 *
 * Importing data will OVERWRITE all existing data, which is why we have
 * confirmAlert to ensure the user wants to perform this action
 *
 * Key Features:
 * - Import data from JSON file
 * - Validation vis confirmAlert
 */

import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, showToast, Toast } from "@raycast/api";
import fs from "fs";
import path from "path";
import { importFromFile } from "./utils/storage";

export default function ImportData() {
  const validateFile = (file: string) => {
    if (!file) {
      throw new Error("No file selected.");
    }

    if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
      throw new Error("The selected file is invalid or does not exist.");
    }

    // Validate file type (e.g., only allow .json files)
    const allowedExtensions = [".json"];
    const fileExtension = path.extname(file);
    if (!allowedExtensions.includes(fileExtension)) {
      throw new Error(`Invalid file type. Please select a ${allowedExtensions.join(",")} file.`);
    }
  };

  const handleImport = (values: { files: string[] }) => {
    const file = values.files[0];
    try {
      validateFile(file);
      return importFromFile(file);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      console.error("Error", errorMessage);
      showToast({ style: Toast.Style.Failure, title: "Error", message: errorMessage });
      return false;
    }
  };

  const handleConfirmImport = (values: { files: string[] }) => {
    return confirmAlert({
      title: "Import data",
      message: "This will replace all current data. This action is not reversible.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
        onAction: () => handleImport(values),
      },
      dismissAction: {
        title: "Cancel",
      },
    });
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import" icon={Icon.Download} onSubmit={handleConfirmImport} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" allowMultipleSelection={false} />
    </Form>
  );
}
