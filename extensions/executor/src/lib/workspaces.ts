import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { getPreferenceValues, LocalStorage } from "@raycast/api";

export interface Workspace {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  defaultOwner?: "all" | "user" | "org";
  organizationSlug?: string;
  isLegacy?: boolean;
}

const PREFIX = "workspace-profile:";
const ACTIVE = "active-workspace";
const context = new AsyncLocalStorage<Workspace>();
let commandWorkspace: Workspace | undefined;

export function normalizeServerUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim() || "https://executor.sh");
  } catch {
    throw new Error("Enter a valid Executor server URL.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error("Use an HTTPS server origin, or local HTTP, without a path or credentials.");
  }
  return url.origin;
}

/** Credential identity is immutable: replacing a key creates a different workspace ID. */
export function workspaceIdFor(baseUrl: string, apiKey: string): string {
  return createHash("sha256")
    .update(JSON.stringify([normalizeServerUrl(baseUrl), apiKey.trim()]))
    .digest("hex");
}

function validateWorkspace(value: Workspace): Workspace {
  if (
    !value ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    typeof value.apiKey !== "string" ||
    !value.apiKey.trim()
  ) {
    throw new Error("A workspace name and API key are required.");
  }
  const baseUrl = normalizeServerUrl(value.baseUrl);
  if (value.id !== workspaceIdFor(baseUrl, value.apiKey))
    throw new Error("Workspace credentials do not match its identity. Add a new workspace for a replacement key.");
  if (value.defaultOwner && !["all", "user", "org"].includes(value.defaultOwner))
    throw new Error("Invalid connection ownership filter.");
  return {
    id: value.id,
    name: value.name.trim(),
    baseUrl,
    apiKey: value.apiKey,
    defaultOwner: value.defaultOwner,
    organizationSlug: typeof value.organizationSlug === "string" ? value.organizationSlug : undefined,
  };
}

function legacyWorkspace(): Workspace | undefined {
  const prefs = getPreferenceValues<{ apiKey?: string; baseUrl?: string; defaultOwner?: Workspace["defaultOwner"] }>();
  if (!prefs.apiKey?.trim()) return undefined;
  const baseUrl = normalizeServerUrl(prefs.baseUrl || "https://executor.sh");
  return {
    id: workspaceIdFor(baseUrl, prefs.apiKey),
    name: "Default Workspace",
    baseUrl,
    apiKey: prefs.apiKey,
    defaultOwner: prefs.defaultOwner,
    isLegacy: true,
  };
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const values = await LocalStorage.allItems();
  const profiles = Object.entries(values)
    .filter(([key]) => key.startsWith(PREFIX))
    .map(([key, value]) => {
      try {
        const profile = validateWorkspace(JSON.parse(String(value)));
        if (key !== PREFIX + profile.id) throw new Error("Mismatched identity");
        return profile;
      } catch {
        throw new Error("A saved workspace could not be read. Restore its configuration before continuing.");
      }
    });
  const legacy = legacyWorkspace();
  if (legacy) {
    const saved = profiles.find((profile) => profile.id === legacy.id);
    if (saved) {
      saved.isLegacy = true;
      saved.defaultOwner = legacy.defaultOwner;
    }
  }
  if (legacy && !profiles.some((profile) => profile.id === legacy.id)) profiles.unshift(legacy);
  return profiles;
}

export async function activeWorkspaceId(): Promise<string | undefined> {
  return LocalStorage.getItem<string>(ACTIVE);
}

export class WorkspaceNotConfiguredError extends Error {}

export async function resolveWorkspace(id?: string): Promise<Workspace> {
  const profiles = await listWorkspaces();
  const selected = id ?? (await activeWorkspaceId());
  const workspace = selected ? profiles.find((profile) => profile.id === selected) : profiles[0];
  if (!workspace) {
    if (selected) throw new Error("This workspace is no longer configured. Choose a workspace again.");
    throw new WorkspaceNotConfiguredError("Add a workspace to connect Executor.");
  }
  return Object.freeze({ ...workspace });
}

export async function activateWorkspace(id: string): Promise<void> {
  await resolveWorkspace(id);
  await LocalStorage.setItem(ACTIVE, id);
}

/** Raycast LocalStorage is encrypted; profiles never enter the disk Cache API. */
export async function saveWorkspace(workspace: Workspace): Promise<void> {
  const valid = validateWorkspace(workspace);
  const existing = await listWorkspaces();
  if (existing.some((profile) => profile.id !== valid.id && profile.name.toLowerCase() === valid.name.toLowerCase())) {
    throw new Error("A workspace already uses this name. Choose a distinct name so targets stay clear.");
  }
  await LocalStorage.setItem(PREFIX + valid.id, JSON.stringify(valid));
}

export async function removeWorkspace(id: string): Promise<void> {
  const profiles = await listWorkspaces();
  const profile = profiles.find((value) => value.id === id);
  if (!profile) throw new Error("Workspace no longer exists.");
  if (profile.isLegacy || legacyWorkspace()?.id === id)
    throw new Error(
      "This workspace also uses the API key in extension preferences. Clear that preference before removing it.",
    );
  if ((await activeWorkspaceId()) === id) {
    const next = profiles.find((value) => value.id !== id);
    if (next) await activateWorkspace(next.id);
    else await LocalStorage.removeItem(ACTIVE);
  }
  await LocalStorage.removeItem(PREFIX + id);
}

export function runInWorkspace<T>(workspace: Workspace, callback: () => T): T {
  return context.run(Object.freeze({ ...workspace }), callback);
}

/** A native command pins its configuration for the lifetime of its navigation stack. */
export function bindCommandWorkspace(workspace: Workspace): void {
  if (commandWorkspace && commandWorkspace.id !== workspace.id)
    throw new Error("Reopen the command to change workspaces.");
  commandWorkspace ??= Object.freeze({ ...workspace });
}

export function currentWorkspace(): Workspace | undefined {
  return context.getStore() ?? commandWorkspace;
}

export function workspaceSummary(workspace: Workspace) {
  return {
    id: workspace.id,
    name: workspace.name,
    server: workspace.baseUrl,
    organization: workspace.organizationSlug,
  };
}

export function workspaceTitle(title: string): string {
  const workspace = currentWorkspace();
  if (!workspace) return title;
  return `${title} · ${workspace.name}`;
}

/** Alerts label workspace context explicitly instead of appending an ambiguous title suffix. */
export function workspaceConfirmationMessage(message: string): string {
  const workspace = currentWorkspace();
  return workspace ? `Workspace: ${workspace.name}\n\n${message}` : message;
}
