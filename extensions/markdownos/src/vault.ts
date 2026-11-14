import { existsSync, statSync } from "fs";
import path from "path";
import { getPreferenceValues } from "@raycast/api";

// Matches METADATA_DIR_NAME in MarkdownOS's main/handlers/vault.ts.
export const VAULT_MARKER_DIR = ".markdownos";

export function isValidVault(vaultPath: string): boolean {
  const markerPath = path.join(vaultPath, VAULT_MARKER_DIR);
  return existsSync(markerPath) && statSync(markerPath).isDirectory();
}

export function getVaultPath(): string {
  return getPreferenceValues<Preferences>().vaultPath;
}
