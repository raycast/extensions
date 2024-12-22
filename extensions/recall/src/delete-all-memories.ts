import { showToast, Toast, confirmAlert, Alert, getPreferenceValues } from "@raycast/api";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

interface Memory {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  imagePath: string;
}

interface Preferences {
  storageDir?: string;
}

const DEFAULT_STORAGE_DIR = join(homedir(), ".raycast-recall");

export default async function Command() {
  try {
    const options = {
      title: "Delete All Memories",
      message: "Are you sure you want to delete all memories? This action cannot be undone.",
      primaryAction: {
        title: "Delete All",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      const preferences = getPreferenceValues<Preferences>();
      const storageDir = preferences.storageDir || DEFAULT_STORAGE_DIR;
      const memoriesPath = join(storageDir, "memories.json");

      if (existsSync(memoriesPath)) {
        // Read memories to get image paths
        const memories: Memory[] = JSON.parse(readFileSync(memoriesPath, "utf-8"));

        // Delete all image files
        for (const memory of memories) {
          if (existsSync(memory.imagePath)) {
            unlinkSync(memory.imagePath);
          }
        }

        // Clear memories file
        writeFileSync(memoriesPath, JSON.stringify([], null, 2));

        await showToast({
          style: Toast.Style.Success,
          title: "All Memories Deleted",
          message: `Deleted ${memories.length} memories`,
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "No Memories Found",
          message: "Nothing to delete",
        });
      }
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to delete memories",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
