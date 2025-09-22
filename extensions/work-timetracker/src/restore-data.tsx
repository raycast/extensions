import { Action, ActionPanel, Form, showToast, Toast, useNavigation, confirmAlert, Alert } from "@raycast/api";
import { readFile } from "fs/promises";
import { writeItem } from "@utils/storage-helper";

export default function RestoreDataForm() {
  const { pop } = useNavigation();

  async function handleSubmit(values: { backupFile: string[] }) {
    if (!values.backupFile || values.backupFile.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No File Selected",
        message: "Please select a backup file.",
      });
      return;
    }

    const backupFilePath = values.backupFile[0];

    if (
      !(await confirmAlert({
        title: "Overwrite Existing Data?",
        message: "Restoring from a backup will overwrite all current projects and time entries. This cannot be undone.",
        primaryAction: { title: "Restore", style: Alert.ActionStyle.Destructive },
      }))
    ) {
      return;
    }

    await showToast(Toast.Style.Animated, "Restoring data...");

    try {
      const fileContent = await readFile(backupFilePath, "utf8");
      const backupData = JSON.parse(fileContent);

      if (backupData.version !== 1 || !backupData.projects || !backupData.timeEntries) {
        throw new Error("Invalid or unsupported backup file format.");
      }

      await writeItem("projects", backupData.projects);
      await writeItem("timeEntries", backupData.timeEntries);

      await showToast({
        style: Toast.Style.Success,
        title: "Restore Successful",
        message: "Data has been restored from the backup file.",
      });
      pop();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await showToast({ style: Toast.Style.Failure, title: "Restore Failed", message });
      console.error("Restore failed:", error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Restore Backup" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="backupFile" title="Select Backup File" allowMultipleSelection={false} />
      <Form.Description text="Select the 'work-timetracker-backup.json' file you want to restore from." />
    </Form>
  );
}
