import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { readFileSync, existsSync } from "fs";
import { checkForScoreInstallation, parseCSV } from "../utils/utils";
import { Score } from "../types/Score";

async function loadScores(): Promise<Score[]> {
  // Check if forScore is installed
  const isInstalled = await checkForScoreInstallation();
  if (!isInstalled) {
    throw new Error("forScore is not installed");
  }

  // Get CSV path from preferences
  const { csvPath } = getPreferenceValues<ExtensionPreferences>();

  if (!csvPath) {
    throw new Error("No CSV file configured. Please set the CSV Backup File in preferences");
  }

  // Check if CSV exists
  if (!existsSync(csvPath)) {
    throw new Error("CSV file not found. Please update the path in preferences");
  }

  // Read and parse CSV
  const csvContent = readFileSync(csvPath, "utf-8");
  return parseCSV(csvContent);
}

export function useScores() {
  return useCachedPromise(loadScores);
}
