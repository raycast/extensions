import axios from "axios";
import { BASE_API_URL } from "@utils/constants";
import { apiKey, commandName, extensionName } from "@utils/env";
import { DeleteLinkResponseBody, LinkSchema, TagSchema, WorkspaceId, WorkspaceSchema } from "@/types";
import { captureException } from "@raycast/api";

const hasHttps = (url: string) => url.startsWith("https://");
const headers = {
  Authorization: "Bearer " + apiKey,
  "Content-Type": "application/json",
  "user-agent": `${extensionName}/${commandName}`,
};

export const getAllWorkspaces = async () => {
  return await axios({
    method: "GET",
    url: `${BASE_API_URL}/workspaces`,
    headers,
  })
    .then(({ data }) => data as WorkspaceSchema[])
    .catch(({ response }) => {
      captureException(new Error(JSON.stringify(response.data.error)));
      throw new Error(response.data.error.message);
    });
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

  return await axios({
    method: "POST",
    url: `${BASE_API_URL}/links?workspaceId=${workspaceId}`,
    headers,
    data: { domain, url, key, tagIds, comments },
  })
    .then(({ data }) => data as LinkSchema)
    .catch(({ response }) => {
      captureException(new Error(JSON.stringify(response.data.error)));
      throw new Error(response.data.error.message);
    });
};

export const getAllShortLinks = async ({ workspaceId }: WorkspaceId) => {
  return await axios({
    method: "GET",
    url: `${BASE_API_URL}/links?workspaceId=${workspaceId}`,
    headers,
  })
    .then(({ data }) => data as LinkSchema[])
    .catch(({ response }) => {
      captureException(new Error(JSON.stringify(response.data.error)));
      throw new Error(response.data.error.message);
    });
};

export const deleteShortLink = async ({ linkId, workspaceId }: { linkId: string } & WorkspaceId) => {
  return await axios({
    method: "DELETE",
    url: `${BASE_API_URL}/links/${linkId}?workspaceId=${workspaceId}`,
    headers,
  })
    .then(({ data }) => data as DeleteLinkResponseBody)
    .catch(({ response }) => {
      captureException(new Error(JSON.stringify(response.data.error)));
      throw new Error(response.data.error.message);
    });
};

export const getAllTags = async ({ workspaceId }: WorkspaceId) => {
  return await axios({
    method: "GET",
    url: `${BASE_API_URL}/tags?workspaceId=${workspaceId}`,
    headers,
  })
    .then(({ data }) => data as TagSchema[])
    .catch(({ response }) => {
      captureException(new Error(JSON.stringify(response.data.error)));
      throw new Error(response.data.error.message);
    });
};
