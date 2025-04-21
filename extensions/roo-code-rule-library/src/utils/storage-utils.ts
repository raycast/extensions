import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "./utils";
import * as fs from "fs/promises";
interface Preferences {
  storageDirectory: string;
}

export const ensureStorageDirectoryExists = async (): Promise<void> => {
  const preferences = getPreferenceValues<Preferences>();
  const storageDirectory = preferences.storageDirectory;
  const expandedStorageDirectory = storageDirectory.replace(/^~/, process.env.HOME || "");
  try {
    await fs.mkdir(expandedStorageDirectory, { recursive: true });
  } catch (error) {
    showFailureToast("Failed to create storage directory", error);
    throw error;
  }
};
