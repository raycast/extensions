import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { getAccounts } from "./storage";
import fs from "fs/promises"; // For file writing
import path from "path"; // For path handling

export default function ExportDataForm() {
  const { pop } = useNavigation();

  const handleSubmit = async (values: { path: string[] }) => {
    // Note: path is string[] from FilePicker
    if (!values.path || values.path.length === 0) {
      showToast({ style: Toast.Style.Failure, title: "Folder is required" });
      return;
    }

    const selectedPath = values.path[0]; // Get the first (only) selected path as string

    try {
      const accounts = await getAccounts();
      const jsonData = JSON.stringify(accounts, null, 2); // Pretty-print JSON
      const exportPath = path.join(selectedPath, "coc-data.json"); // Save as coc-data.json in selected folder

      await fs.writeFile(exportPath, jsonData, "utf8");
      console.log("Exported data to", exportPath); // Debug log
      showToast({ style: Toast.Style.Success, title: "Data exported successfully", message: exportPath });
      pop();
    } catch (error) {
      console.error("Error exporting data:", error);
      showToast({ style: Toast.Style.Failure, title: "Failed to export data" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="path"
        title="Save To Folder"
        allowMultiple={false}
        canChooseDirectories={true}
        canChooseFiles={false}
      />
    </Form>
  );
}
