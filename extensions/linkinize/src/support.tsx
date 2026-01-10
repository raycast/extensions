import { Cache, Toast, getPreferenceValues, openExtensionPreferences, showToast } from "@raycast/api";
import axios, { AxiosError } from "axios";
import {
  ACTIVE_ORGANIZATION,
  ACTIVE_WORKSPACE,
  BOOKMARKS,
  EXTENSION_VERSION,
  INTERACTIONS,
  LINKINIZE_DOMAIN,
  ORGANIZATIONS,
  TAGS,
  TOKEN,
  WORKSPACES,
} from "./constants";
import { Bookmark, Interaction, LoginPayload, LoginResponse, SyncResponse } from "./interfaces";

export const cache = new Cache();

export function getToken() {
  return cache.get(TOKEN) ?? null;
}

export function getCachedBookmarks() {
  const cached = cache.get(BOOKMARKS);
  return cached ? (JSON.parse(cached) as Bookmark[]) : [];
}

export function getCachedOrganizations() {
  const cached = cache.get(ORGANIZATIONS);
  return cached ? (JSON.parse(cached) as SyncResponse["meta"]["organizations"]) : [];
}

export function getCachedWorkspaces() {
  const cached = cache.get(WORKSPACES);
  return cached ? (JSON.parse(cached) as SyncResponse["active"]["workspaces"]) : [];
}

export function getActiveOrganizationId() {
  return cache.get(ACTIVE_ORGANIZATION) ?? null;
}

export function getActiveWorkspaceId() {
  return cache.get(ACTIVE_WORKSPACE) ?? null;
}

export function getInteractionsPayload() {
  const cached = cache.get(INTERACTIONS);
  const interactions = cached ? (JSON.parse(cached) as Interaction[]) : [];
  return Buffer.from(JSON.stringify(interactions)).toString("base64");
}

export function applySyncResponse(sync: SyncResponse) {
  cache.set(BOOKMARKS, JSON.stringify(sync.active.bookmarks ?? []));
  cache.set(TAGS, JSON.stringify(sync.active.tags ?? []));
  cache.set(WORKSPACES, JSON.stringify(sync.active.workspaces ?? []));
  cache.set(ACTIVE_WORKSPACE, sync.active.workspace_id);
  cache.set(ACTIVE_ORGANIZATION, sync.active.organization_id);
  cache.set(ORGANIZATIONS, JSON.stringify(sync.meta.organizations ?? []));
  cache.remove(INTERACTIONS);
}

export async function attemptLogin(values: LoginPayload) {
  const response = await axios.post(`${LINKINIZE_DOMAIN}/api/auth/login`, values);
  const data = response.data as LoginResponse;
  cache.set(TOKEN, data.access_token);
  applySyncResponse(data.sync);
  await showToast({ title: "Linkinize is Ready", message: "Bookmarks synced for your active workspace." });
  return true;
}

export async function logout(message = "Please check your credentials in Extension Preferences.") {
  await showToast({
    title: "Authentication Required",
    message,
    style: Toast.Style.Failure,
  });
  cache.clear();
  await openExtensionPreferences();
}

export async function handleAPIErrors(error: AxiosError, fallbackMessage = "Something went wrong, please try again.") {
  const status = error.response?.status;
  if (status === 401) {
    await logout("Your session expired. Please sign in again.");
    return;
  }
  if (status === 404) {
    await showToast({ title: "Error", message: "Not found, please try again.", style: Toast.Style.Failure });
    return;
  }
  if (status === 500) {
    await showToast({ title: "Error", message: "Server error. Please try again in a bit." });
    return;
  }
  await showToast({ title: "Error", message: fallbackMessage, style: Toast.Style.Failure });
}

export function recordInteraction(url: string) {
  const cachedBookmarks = getCachedBookmarks();
  const bookmark = cachedBookmarks.find((obj: Bookmark) => obj.url === url);
  if (!bookmark) {
    return;
  }
  const cached = cache.get(INTERACTIONS);
  const interactions = cached ? (JSON.parse(cached) as Interaction[]) : [];
  const organizationId = getActiveOrganizationId();
  const workspaceId = getActiveWorkspaceId();
  if (!organizationId || !workspaceId) {
    return;
  }
  interactions.push({
    id: bookmark.id,
    at: Math.round(Date.now() / 1000),
    oid: organizationId,
    wid: workspaceId,
  });
  cache.set(INTERACTIONS, JSON.stringify(interactions));
}

export async function authenticationCheck() {
  const token = getToken();
  if (token) {
    return true;
  }
  try {
    return await attemptLogin(getPreferenceValues<LoginPayload>());
  } catch (error) {
    await logout();
    return false;
  }
}

export async function performSync(options?: { organizationId?: string; workspaceId?: string }) {
  const token = getToken();
  if (!token) {
    return false;
  }
  const query = new URLSearchParams();
  if (options?.organizationId) {
    query.set("organization", options.organizationId);
  } else if (options?.workspaceId) {
    query.set("workspace", options.workspaceId);
  } else {
    const activeWorkspaceId = getActiveWorkspaceId();
    if (activeWorkspaceId) {
      query.set("workspace", activeWorkspaceId);
    }
  }
  const queryString = query.toString();
  const url = `${LINKINIZE_DOMAIN}/api/sync${queryString ? `?${queryString}` : ""}`;
  try {
    const response = await axios.post(
      url,
      {
        data: getInteractionsPayload(),
        extension_version: EXTENSION_VERSION,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Client-Source": "raycast",
        },
      }
    );
    applySyncResponse(response.data as SyncResponse);
    return true;
  } catch (error) {
    await handleAPIErrors(error as AxiosError);
    return false;
  }
}
