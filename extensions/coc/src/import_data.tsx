import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { getAccounts, saveAccounts, Account } from "./storage";
import fs from "fs/promises"; // For reading file

export default function ImportDataForm() {
  const { pop } = useNavigation();

  const handleSubmit = async (values: { file: string[] }) => {
    if (!values.file || values.file.length === 0) {
      showToast({ style: Toast.Style.Failure, title: "File is required" });
      return;
    }

    const filePath = values.file[0]; // File picker returns array, take first

    try {
      const jsonData = await fs.readFile(filePath, "utf8");
      const importedAccounts: Account[] = JSON.parse(jsonData);

      const current = await getAccounts();
      const updated = [...current, ...importedAccounts]; // Merge (or replace: = importedAccounts)
      await saveAccounts(updated);

      console.log("Imported data from", filePath); // Debug log
      showToast({
        style: Toast.Style.Success,
        title: "Data imported successfully",
        message: `Added ${importedAccounts.length} accounts`,
      });
      pop();
    } catch (error) {
      console.error("Error importing data:", error);
      showToast({ style: Toast.Style.Failure, title: "Failed to import data" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="file" title="Select JSON File" allowMultiple={false} />
    </Form>
  );
}
