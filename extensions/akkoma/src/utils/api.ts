import fetch from "node-fetch";
import fs from "fs";
import { FormData, File } from "node-fetch";
import { OAuth, getPreferenceValues } from "@raycast/api";
import {
  Credentials,
  Preference,
  StatusRequest,
  StatusResponse,
  Account,
  StatusAttachment,
  UploadAttachResponse,
  Status,
} from "./types";
import { client } from "./oauth";
import { RequestInit, Response } from "node-fetch";

const { instance } = getPreferenceValues<Preference>();

const CONFIG = {
  tokenUrl: "/oauth/token",
  appUrl: "/api/v1/apps",
  statusesUrl: "/api/v1/statuses",
  accountsUrl: "/api/v1/accounts/",
  verifyCredentialsUrl: "/api/v1/accounts/verify_credentials",
  mediaUrl: "/api/v1/media/",
  bookmarkUrl: "/api/v1/bookmarks",
};

const apiUrl = (instance: string, path: string): string => `https://${instance}${path}`;

const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const tokenSet = await client.getTokens();
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${tokenSet?.accessToken}`,
  };
  return fetch(url, { ...options, headers });
};

const fetchToken = async (params: URLSearchParams, errorMessage: string): Promise<OAuth.TokenResponse> => {
  const response = await fetch(apiUrl(instance, CONFIG.tokenUrl), {
    method: "POST",
    body: params,
  });

  if (!response.ok) throw new Error(errorMessage);
  return (await response.json()) as OAuth.TokenResponse;
};

const createApp = async (): Promise<Credentials> => {
  const response = await fetch(apiUrl(instance, CONFIG.appUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "raycast-akkoma-extension",
      redirect_uris: "https://raycast.com/redirect?packageName=Extension",
      scopes: "read write",
      website: "https://raycast.com",
    }),
  });

  if (!response.ok) throw new Error("Failed to create Akkoma app");

  return (await response.json()) as Credentials;
};

const postNewStatus = async (statusOptions: Partial<StatusRequest>): Promise<StatusResponse> => {
  const response = await fetchWithAuth(apiUrl(instance, CONFIG.statusesUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(statusOptions),
  });

  if (!response.ok) throw new Error("Failed to publish");

  return (await response.json()) as StatusResponse;
};

const fetchAccountInfo = async (): Promise<Account> => {
  const response = await fetchWithAuth(apiUrl(instance, CONFIG.verifyCredentialsUrl));

  if (!response.ok) throw new Error("Failed to fetch account's info");
  return (await response.json()) as Account;
};

const uploadAttachment = async ({ file, description }: StatusAttachment): Promise<UploadAttachResponse> => {
  const attachment = fs.readFileSync(file);
  const attachmentData = new File([attachment], file);
  await attachmentData.arrayBuffer();

  const formData = new FormData();
  formData.append("file", attachmentData);
  formData.append("description", description ?? "");

  const response = await fetchWithAuth(apiUrl(instance, CONFIG.mediaUrl), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) throw new Error("Could not upload attachments");
  return (await response.json()) as UploadAttachResponse;
};

const fetchBookmarks = async (): Promise<Status[]> => {
  const { bookmarkLimit } = getPreferenceValues<Preference>();
  const url = bookmarkLimit ? CONFIG.bookmarkUrl + `?&limit=${bookmarkLimit}` : CONFIG.bookmarkUrl;

  const response = await fetchWithAuth(apiUrl(instance, url));
  if (!response.ok) throw new Error("Could not fetch bookmarks");

  return (await response.json()) as Status[];
};

const fetchUserStatus = async (): Promise<Status[]> => {
  const { id } = await fetchAccountInfo();
  const url = CONFIG.accountsUrl + id + "/statuses?exclude_replies=false&with_muted=true";

  const response = await fetchWithAuth(apiUrl(instance, url));
  if (!response.ok) throw new Error("Could not fetch user's status");

  return (await response.json()) as Status[];
};

export default {
  fetchToken,
  createApp,
  postNewStatus,
  fetchAccountInfo,
  uploadAttachment,
  fetchBookmarks,
  fetchUserStatus,
};
