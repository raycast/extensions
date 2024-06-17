import axios from "axios";
import { BASE_API_URL } from "../utils/constants";
import { apiKey } from "../utils/env";
import { DeleteLinkResponseBody, LinkSchema, TagSchema, WorkspaceId, WorkspaceSchema } from "../types";

const hasHttps = (url: string) => url.startsWith("https://");
const headers = { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" };

export const getAllWorkspaces = async () => {
  const response = await axios({
    method: "GET",
    url: `${BASE_API_URL}/workspaces`,
    headers,
  });

  return response.data as WorkspaceSchema[];
};

export const createShortLink = async ({
  originalUrl,
  key,
  workspaceId,
  domain,
  tagIds,
  comments,
}: { originalUrl: string; key?: string; domain?: string; tagIds?: string[]; comments?: string } & WorkspaceId) => {
  const url = hasHttps(originalUrl) ? originalUrl : `https://${originalUrl}`;

  const response = await axios({
    method: "POST",
    url: `${BASE_API_URL}/links?workspaceId=${workspaceId}`,
    headers,
    data: { domain, url, key, tagIds, comments },
  });

  return response.data as LinkSchema;
};

export const getAllShortLinks = async ({ workspaceId }: WorkspaceId) => {
  const response = await axios({
    method: "GET",
    url: `${BASE_API_URL}/links?workspaceId=${workspaceId}`,
    headers,
  });

  return response.data as LinkSchema[];
};

export const deleteShortLink = async ({ linkId, workspaceId }: { linkId: string } & WorkspaceId) => {
  const response = await axios({
    method: "DELETE",
    url: `${BASE_API_URL}/links/${linkId}?workspaceId=${workspaceId}`,
    headers,
  });

  return response.data as DeleteLinkResponseBody;
};

export const getAllTags = async ({ workspaceId }: WorkspaceId) => {
  const response = await axios({
    method: "GET",
    url: `${BASE_API_URL}/tags?workspaceId=${workspaceId}`,
    headers,
  });

  return response.data as TagSchema[];
};
