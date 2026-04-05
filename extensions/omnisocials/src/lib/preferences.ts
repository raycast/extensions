import { getPreferenceValues } from "@raycast/api";
import type { Preferences, WorkspaceProfile } from "./types";

// In-memory cache for the active workspace (set by commands on load)
let _activeWorkspace: WorkspaceProfile | null = null;

export function setActiveWorkspaceContext(
  workspace: WorkspaceProfile | null,
): void {
  _activeWorkspace = workspace;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function getApiKey(): string {
  if (_activeWorkspace) return _activeWorkspace.apiKey;
  return getPreferences().apiKey;
}

export function getBaseUrl(): string {
  if (_activeWorkspace?.baseUrl) {
    return _activeWorkspace.baseUrl.replace(/\/$/, "");
  }
  return "https://app.omnisocials.com";
}
