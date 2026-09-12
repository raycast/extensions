/**
 * "Export Data" Command
 *
 * Enables users to export all of their questions, conversations,
 * and models to a specified JSON file.
 *
 * Key Features:
 * - Export data to JSON
 * - Data validation
 */

import { ActionPanel, Form, Action, showToast, Toast, Icon } from "@raycast/api";
import fs from "fs";
import { exportToFile } from "./utils/storage";

export default function ExportData() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Export"
            icon={Icon.Upload}
            onSubmit={async (values: { folders: string[] }) => {
              const folder = values.folders[0];
              try {
                if (!folder) {
                  throw new Error("No folder selected.");
                }

                // Ensure the folder exists
                if (!fs.existsSync(folder) || !fs.lstatSync(folder).isDirectory()) {
                  throw new Error("The selected folder is invalid or does not exist.");
                }

                // Write LocalStorage items to the JSON file
                return await exportToFile(folder);
              } catch (error) {
                console.error("Error", error);
                if (error instanceof Error) {
                  showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
                }
                return false;
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="folders" allowMultipleSelection={false} canChooseDirectories canChooseFiles={false} />
    </Form>
  );
}
