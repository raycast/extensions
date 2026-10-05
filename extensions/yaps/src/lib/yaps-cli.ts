import { environment, getApplications, getPreferenceValues } from "@raycast/api";
import { join } from "node:path";
import type { VaultNote, VaultSearchResult, VaultStatus } from "./types";
import { selectYapsApplication, YAPS_BUNDLE_ID } from "./yaps-app-core";
import { YapsCli } from "./yaps-cli-core";

export { fileLabel, YapsCliNotFoundError, YapsCliResponseError, YapsNoteNotFoundError } from "./yaps-cli-core";

let cachedClient: YapsCli | undefined;
let cachedConfiguredPath: string | undefined;

function client(): YapsCli {
  const preferences = getPreferenceValues<Preferences>();
  const configuredPath = preferences.cliPath?.trim() || undefined;
  if (!cachedClient || cachedConfiguredPath !== configuredPath) {
    cachedClient = new YapsCli({
      configuredPath,
      additionalCliPaths: installedYapsCliPaths,
      supportPath: environment.supportPath,
    });
    cachedConfiguredPath = configuredPath;
  }
  return cachedClient;
}

async function installedYapsCliPaths(): Promise<string[]> {
  try {
    const applications = (await getApplications()).filter((application) => application.bundleId === YAPS_BUNDLE_ID);
    const application = selectYapsApplication(applications);
    if (!application) {
      return [];
    }
    return [join(application.path, "Contents", "MacOS", "yaps_cli")];
  } catch {
    return [];
  }
}

export async function resolveCliPath(): Promise<string> {
  return client().resolveCliPath();
}

export async function listNotes(limit = 40, signal?: AbortSignal): Promise<VaultNote[]> {
  return client().listNotes(limit, signal);
}

export async function searchNotes(query: string, limit = 30, signal?: AbortSignal): Promise<VaultSearchResult> {
  return client().searchNotes(query, limit, signal);
}

export async function getNote(path: string): Promise<VaultNote> {
  return client().getNote(path);
}

export async function getVaultStatus(): Promise<VaultStatus> {
  return client().getVaultStatus();
}

export async function resolveVaultFile(notePath: string): Promise<string> {
  return client().resolveVaultFile(notePath);
}

export async function createClipboardNote(title: string, markdown: string, folder: string): Promise<VaultNote> {
  return client().createClipboardNote(title, markdown, folder);
}
