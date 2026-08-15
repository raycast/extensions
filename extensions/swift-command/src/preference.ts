import { environment, getPreferenceValues } from "@raycast/api";
import path from "path";

export const preferences: {
  datasourcePath: string;
} = getPreferenceValues();

export function getDatasourcePath(): string {
  // Fix: preferences.datasourcePath returns undefined on Windows
  let datasourcePath = preferences.datasourcePath || "swift-command.json";
  const folderPath = environment.supportPath;
  if (!path.isAbsolute(datasourcePath)) {
    datasourcePath = path.join(folderPath, datasourcePath);
  }

  return datasourcePath;
}

export function getDatasourceFolderPath(): string {
  const datasourcePath = getDatasourcePath();
  return path.dirname(datasourcePath);
}
