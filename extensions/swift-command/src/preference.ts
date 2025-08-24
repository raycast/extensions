import { environment, getPreferenceValues } from "@raycast/api";
import path from "path";

export const preferences: {
  datasourcePath: string;
} = getPreferenceValues();

export function getDatasourcePath(): string {
  let datasourcePath = preferences.datasourcePath;
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
