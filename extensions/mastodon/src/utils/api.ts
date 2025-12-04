import fs from "node:fs";
import fetch, { HeadersInit, FormData, File } from "node-fetch";
import { OAuth, getPreferenceValues } from "@raycast/api";
import {
  Credentials,
  StatusRequest,
  StatusResponse,
  Account,
  StatusAttachment,
  UploadAttachResponse,
  Status,
  MastodonError,
  Notification,
} from "./types";
import { client, permissionScope } from "./oauth";

const CONFIG = {
  tokenUrl: "/oauth/token",
  appUrl: "/api/v1/apps",
  statusesUrl: "/api/v1/statuses",
  accountsUrl: "/api/v1/accounts/",
  verifyCredentialsUrl: "/api/v1/accounts/verify_credentials",
  mediaUrl: "/api/v2/media",
  bookmarkUrl: "/api/v1/bookmarks",
  homeTLUrl: "/api/v1/timelines/home",
  publicTLUrl: "/api/v1/timelines/public",
  notificationsUrl: "/api/v1/notifications",
};
const sanitize = (instance: string): string =>
  instance.endsWith("/") ? instance.slice(0, -1).trim() : instance.trim();

const requestApi = async <T>(
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  endpoint: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any,
  isFormData?: boolean,
): Promise<T> => {
  const { instance }: Preferences = getPreferenceValues();

  if (!instance) {
    throw new Error("instance is required");
  }

  const sanitizedInstance = sanitize(instance);

  const tokenSet = await client.getTokens();
  const headers: HeadersInit = { Authorization: `Bearer ${tokenSet?.accessToken}` };

  if ((method === "POST" || method === "PUT") && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`https://${sanitizedInstance}${endpoint}`, {
    method,
    headers,
    body: isFormData ? body : JSON.stringify(body),
  });

  if (!response.ok) throw (await response.json()) as MastodonError;
  return (await response.json()) as T;
};

const fetchToken = async (params: URLSearchParams): Promise<OAuth.TokenResponse> => {
  const { instance }: Preferences = getPreferenceValues();

  if (!instance) {
    throw new Error("instance is required");
  }

  const response = await fetch(`https://${instance}/${CONFIG.tokenUrl}`, {
    method: "POST",
    body: params,
  });

  if (!response.ok) throw (await response.json()) as MastodonError;
  return (await response.json()) as OAuth.TokenResponse;
};

const createApp = async (): Promise<Credentials> =>
  requestApi<Credentials>("POST", CONFIG.appUrl, {
    client_name: "Raycast - Mastodon",
    redirect_uris: "https://raycast.com/redirect?packageName=Extension",
    scopes: permissionScope,
    website: "https://raycast.com/SevicheCC/mastodon",
  });

const fetchAccountInfo = async (): Promise<Account> => requestApi<Account>("GET", CONFIG.verifyCredentialsUrl);

const uploadAttachment = async ({ file, description }: StatusAttachment): Promise<UploadAttachResponse> => {
  const attachment = fs.readFileSync(file);
  const attachmentData = new File([attachment], file);
  await attachmentData.arrayBuffer();
  const formData = new FormData();
  formData.append("file", attachmentData);
  formData.append("description", description ?? "");
  return await requestApi<UploadAttachResponse>("POST", CONFIG.mediaUrl, formData, true);
};

const fetchBookmarks = async (): Promise<Status[]> => {
  const { bookmarkLimit }: Preferences.Bookmark = getPreferenceValues();
  const endpoint = bookmarkLimit ? CONFIG.bookmarkUrl + `?&limit=${bookmarkLimit}` : CONFIG.bookmarkUrl;

  return await requestApi<Status[]>("GET", endpoint);
};

const fetchUserStatus = async (): Promise<Status[]> => {
  const { id } = await fetchAccountInfo();
  const endpoint = CONFIG.accountsUrl + id + "/statuses?exclude_replies=false&exclude_reblogs=true";

  return await requestApi<Status[]>("GET", endpoint);
};

const fetchHomeTL = async (): Promise<Status[]> => {
  const { statusLimit }: Preferences.Home = getPreferenceValues();
  const endpoint = statusLimit ? CONFIG.homeTLUrl + `?&limit=${statusLimit}` : CONFIG.homeTLUrl;

  return await requestApi<Status[]>("GET", endpoint);
};

// TODO: Add query parameters ? local only ?

const fetchPublicTL = async (): Promise<Status[]> => requestApi<Status[]>("GET", CONFIG.publicTLUrl);

const postNewStatus = async (statusOptions: Partial<StatusRequest>): Promise<StatusResponse> =>
  requestApi<StatusResponse>("POST", CONFIG.statusesUrl, statusOptions);

const editStatus = async (id: string, statusOptions: Partial<StatusRequest>): Promise<StatusResponse> =>
  requestApi<StatusResponse>("PUT", `${CONFIG.statusesUrl}/${id}`, statusOptions);

const deleteStatus = async (id: string): Promise<Status> => requestApi<Status>("DELETE", `${CONFIG.statusesUrl}/${id}`);

const favouriteStatus = async (id: string): Promise<Status> =>
  requestApi<Status>("POST", `${CONFIG.statusesUrl}/${id}/favourite`);

const undoFavouriteStatus = async (id: string): Promise<Status> =>
  requestApi<Status>("POST", `${CONFIG.statusesUrl}/${id}/unfavourite`);

const reblogStatus = async (id: string): Promise<Status> =>
  requestApi<Status>("POST", `${CONFIG.statusesUrl}/${id}/reblog`);

const undoReblogStatus = async (id: string): Promise<Status> =>
  requestApi<Status>("POST", `${CONFIG.statusesUrl}/${id}/unreblog`);

const bookmarkStatus = async (id: string): Promise<Status> =>
  requestApi<Status>("POST", `${CONFIG.statusesUrl}/${id}/bookmark`);

const undoBookmarkStatus = async (id: string): Promise<Status> =>
  requestApi<Status>("POST", `${CONFIG.statusesUrl}/${id}/unbookmark`);

const getAllNotifications = async (): Promise<Notification[]> =>
  requestApi<Notification[]>("GET", CONFIG.notificationsUrl);

const dismissAllNotifications = async (): Promise<void> => requestApi<void>("POST", CONFIG.notificationsUrl + "/clear");

export default {
  fetchToken,
  createApp,
  postNewStatus,
  deleteStatus,
  fetchAccountInfo,
  uploadAttachment,
  fetchBookmarks,
  fetchUserStatus,
  fetchHomeTL,
  fetchPublicTL,
  reblogStatus,
  undoReblogStatus,
  favouriteStatus,
  undoFavouriteStatus,
  bookmarkStatus,
  undoBookmarkStatus,
  editStatus,
  getAllNotifications,
  dismissAllNotifications,
};
