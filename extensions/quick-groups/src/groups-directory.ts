import { promises as fs } from "node:fs";
import path from "node:path";
import { environment } from "@raycast/api";
import { createExampleFile } from "./create-example";

export interface GroupsDirectory {
  path: string;
  isDefault: boolean;
}

export function resolveGroupsDirectory(configuredDirectory?: string): GroupsDirectory {
  const configured = configuredDirectory?.trim();
  return configured
    ? { path: configured, isDefault: false }
    : { path: path.join(environment.supportPath, "groups"), isDefault: true };
}

export async function initializeDefaultGroupsDirectory(directory: string): Promise<void> {
  const created = await fs.mkdir(directory, { recursive: true });
  if (created !== undefined) await createExampleFile(directory);
}
