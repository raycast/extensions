import { showToast, Toast } from "@raycast/api";
import { homedir } from "os";
import { writeFile } from "fs/promises";
import path from "path";
import { readItem } from "@utils/storage-helper";

export default async function Command() {
  await showToast(Toast.Style.Animated, "Backing up data...");

  try {
    const projects = await readItem("projects");
    const timeEntries = await readItem("timeEntries");

    if (projects.length === 0 && timeEntries.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Data to Backup",
        message: "There are no projects or time entries to back up.",
      });
      return;
    }

    const backupData = {
      version: 1,
      projects,
      timeEntries,
    };

    const downloadsPath = path.join(homedir(), "Downloads");
    const date = new Date().toISOString().slice(0, 10);
    const backupFilePath = path.join(downloadsPath, `work-timetracker-backup-${date}.json`);

    await writeFile(backupFilePath, JSON.stringify(backupData, null, 2), "utf8");

    await showToast({
      style: Toast.Style.Success,
      title: "Backup Successful",
      message: `Data saved to ${backupFilePath}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await showToast({ style: Toast.Style.Failure, title: "Backup Failed", message });
    console.error("Backup failed:", error);
  }
}
