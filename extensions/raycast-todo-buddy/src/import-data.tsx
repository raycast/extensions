import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import * as fs from "fs";
import { importDataFromJson } from "./repository/localStorage";

export default function Command() {
  async function handleSubmit(values: { file: string[] }) {
    try {
      // Step 1: Get the selected file path
      const filePath = values.file[0];
      if (!filePath) {
        await showToast(Toast.Style.Failure, "No File Selected", "Please select a JSON file.");
        return;
      }

      // Step 2: Read and parse the JSON file
      const fileContent = fs.readFileSync(filePath, "utf-8");

      // Step 3: Import data into Raycast's local storage
      await importDataFromJson(fileContent);

      // Notify user of success
      await showToast(Toast.Style.Success, "Import Successful", "Data has been imported successfully.");
    } catch (error) {
      console.error(error);
      await showToast(Toast.Style.Failure, "Import Failed", "An error occurred while importing the data.");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Data" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="file" title="Select JSON File" />
    </Form>
  );
}
