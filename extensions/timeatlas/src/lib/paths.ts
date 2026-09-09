import { getPreferenceValues } from "@raycast/api";
import os from "os";
import path from "path";

export const DEFAULT_ICLOUD_DIR = path.join(
  os.homedir(),
  "Library",
  "Mobile Documents",
  "iCloud~com~timeatlaslabs~Pat",
  "Documents",
);

export interface ExtensionPreferences {
  icloudPath?: string;
}

export function resolveIcloudDir(override?: string): string {
  const trimmed = override?.trim();
  return trimmed ? trimmed : DEFAULT_ICLOUD_DIR;
}

export function getExtensionPreferences(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function glanceProtoPath(assetsPath: string): string {
  return path.join(assetsPath, "proto", "glance.proto");
}
