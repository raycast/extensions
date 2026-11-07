import {
  WebCullBookmark,
  WebCullCapabilityState,
  WebCullSavePayload,
  WebCullStack,
} from "../types";
import { folderUrl } from "./folderLink";
import { getAuthState, postAuthenticatedWebCull, requireAuthToken } from "./auth";
import { responseItems, responseMessage, WebCullAuthError } from "./http";
import { getWebCullPreferences, WebCullPreferences } from "./preferences";

type CliBookmarkRow = {
  id: number;
  parent_id: number;
  type: "bookmark" | "folder";
  title?: string;
  url?: string;
  tags?: string;
  ete_index?: number;
};

export async function getCapabilityState(): Promise<WebCullCapabilityState> {
  const auth = await getAuthState();

  if (!auth.connected || !auth.token) {
    return {
      bookmarksSearch: false,
      bookmarkWrite: false,
      e2eeEnabled: false,
      localE2eeKeyAvailable: false,
      reason: "Connect your WebCull account to search bookmarks from Raycast.",
      needsAuth: true,
    };
  }

  const unsupported = await accountRequiresEncryption(getWebCullPreferences(), auth.token);
  return {
    accountId: auth.accountId,
    bookmarksSearch: !unsupported,
    bookmarkWrite: !unsupported,
    e2eeEnabled: unsupported,
    reason: unsupported ? ENCRYPTION_UNSUPPORTED : undefined,
    localE2eeKeyAvailable: false,
    user: auth.user || null,
  };
}

export async function searchWebCullBookmarks(
  preferences: WebCullPreferences,
  query: string,
): Promise<WebCullBookmark[]> {
  const auth = await getAuthState();
  const token = auth.token;
  const accountId = auth.accountId;
  if (!auth.connected || !token || !accountId) throw new WebCullAuthError();
  const accountHash = auth.user?.hash;
  if (!accountHash) {
    throw new Error("Reconnect WebCull to load your account link.");
  }
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  await requireUnencryptedAccount(preferences, token);
  const response = await postAuthenticatedWebCull(
    preferences.apiBaseUrl,
    "/raycast/bookmarks-search",
    {
      query: `type:bookmark AND (${trimmedQuery})`,
      fields: "id,parent_id,type,title,url,tags,ete_index,modified",
      limit: 25,
      max_chars: 60000,
      max_metadata_chars: 8000,
      sort: "modified_desc",
    },
    token,
  );

  if (response.success !== "true") {
    throw new Error(responseMessage(response, "Could not search WebCull bookmarks."));
  }

  return responseItems<CliBookmarkRow>(response)
    .filter((row: CliBookmarkRow) => row.type === "bookmark")
    .map((row: CliBookmarkRow) =>
      rowToBookmark(row, preferences.appBaseUrl, accountHash, accountId),
    );
}

export async function getStacks(
  preferences: WebCullPreferences,
  accountId: string,
): Promise<WebCullStack[]> {
  const token = await requireAuthToken(accountId);
  await requireUnencryptedAccount(preferences, token);
  const response = await postAuthenticatedWebCull(
    preferences.apiBaseUrl,
    "/raycast/bookmarks-search",
    {
      query: "type:folder",
      fields: "id,parent_id,type,title,ete_index,modified",
      limit: 100,
      max_chars: 20000,
      max_metadata_chars: 1000,
      sort: "title_asc",
    },
    token,
  );

  if (response.success !== "true") {
    throw new Error(responseMessage(response, "Could not load WebCull stacks."));
  }

  return [
    { id: "0", title: "Root", path: "Root" },
    ...responseItems<CliBookmarkRow>(response).map((row: CliBookmarkRow) => ({
      id: String(row.id),
      title: row.title || `Folder ${row.id}`,
      path: row.title ? `${row.title} (#${row.id})` : `Folder ${row.id}`,
    })),
  ];
}

export async function saveBookmark(
  preferences: WebCullPreferences,
  payload: WebCullSavePayload,
): Promise<void> {
  const url = payload.url.trim();
  if (!isSaveableUrl(url)) {
    throw new Error("Enter a full http:// or https:// URL without embedded credentials.");
  }
  const token = await requireAuthToken(payload.accountId);
  await requireUnencryptedAccount(preferences, token);
  // Metadata is asynchronous; do not submit a form after an account switch or expiry.
  if ((await requireAuthToken(payload.accountId)) !== token) {
    throw new Error("WebCull authorization changed. Reopen this command before saving.");
  }
  const response = await postAuthenticatedWebCull(
    preferences.apiBaseUrl,
    "/raycast/bookmarks-create",
    {
      type: "bookmark",
      url,
      title: payload.title,
      parent_id: payload.parentStackId,
      dry_run: "0",
    },
    token,
  );

  if (response.success !== "true") {
    throw new Error(responseMessage(response, "Could not save bookmark to WebCull."));
  }
}

function isSaveableUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value) || /[\s\\\x00-\x1f\x7f]/.test(value)) return false;
  try {
    const url = new URL(value);
    return Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function rowToBookmark(
  row: CliBookmarkRow,
  appBaseUrl: string,
  accountHash: string,
  accountId: string,
): WebCullBookmark {
  const title = row.title || row.url || `Bookmark ${row.id}`;
  const parentStackId = String(row.parent_id || 0);
  const parentStackPath = parentStackId === "0" ? "Root" : `Folder #${parentStackId}`;

  return {
    accountId,
    id: String(row.id),
    title,
    url: row.url || "",
    parentStackId,
    parentStackPath,
    webcullUrl: folderUrl(appBaseUrl, accountHash, Number(row.parent_id || 0)),
    tags: row.tags
      ? row.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [],
  };
}

const ENCRYPTION_UNSUPPORTED =
  "Encrypted accounts are not supported in Raycast. Use WebCull directly for this account.";

async function accountRequiresEncryption(
  preferences: WebCullPreferences,
  token: string,
): Promise<boolean> {
  const response = await postAuthenticatedWebCull(
    preferences.apiBaseUrl,
    "/raycast/metadata",
    {},
    token,
  );
  if (response.success !== "true") {
    throw new Error(responseMessage(response, "Could not check WebCull account support."));
  }
  const e2ee = response.e2ee as Record<string, unknown> | undefined;
  if (
    !e2ee ||
    !["true", "false"].includes(e2ee.e2ee_enabled as string) ||
    !["true", "false"].includes(e2ee.conversion_in_progress as string)
  ) {
    throw new Error(
      "Could not confirm WebCull account encryption status. Try again before searching or saving.",
    );
  }
  return e2ee.e2ee_enabled === "true" || e2ee.conversion_in_progress === "true";
}

async function requireUnencryptedAccount(
  preferences: WebCullPreferences,
  token: string,
): Promise<void> {
  if (await accountRequiresEncryption(preferences, token)) {
    throw new Error(ENCRYPTION_UNSUPPORTED);
  }
}
