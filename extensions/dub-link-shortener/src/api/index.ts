import axios, { AxiosRequestConfig } from "axios";
import { BASE_API_URL } from "@utils/constants";
import { apiKey, commandName, extensionName } from "@utils/env";
import { DeleteLinkResponseBody, LinkSchema, TagSchema, WorkspaceId, WorkspaceSchema } from "@/types";
import { captureException } from "@raycast/api";

const hasHttps = (url: string) => url.startsWith("https://");
const headers = {
  Authorization: "Bearer " + apiKey,
  "Content-Type": "application/json",
  "user-agent": `raycast/${extensionName}/${commandName}`,
};

/**
 * todo: Replace with SDK https://d.to/sdk once it is stable
 * see: https://github.com/dubinc/dub-node/blob/765e170c45a361de3ae62e0d19571ceca4a3f0f4/README.md#maturity
 */
export const callApi = async <T>(config: AxiosRequestConfig) => {
  return await axios({ ...config, headers })
    .then(({ data }) => data as T)
    .catch(({ response }) => {
      const err = new Error(response?.data?.error?.message ?? "Unknown error");
      captureException(err);
      throw err;
    });
};

export const getAllWorkspaces = async () => {
  return await callApi<WorkspaceSchema[]>({ method: "GET", url: `${BASE_API_URL}/workspaces` });
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
  return await callApi<LinkSchema>({
    method: "POST",
    url: workspaceId ? `${BASE_API_URL}/links?workspaceId=${workspaceId}` : `${BASE_API_URL}/links`,
    data: { domain, url, key, tagIds, comments },
  });
};

export const getAllShortLinks = async ({ workspaceId }: WorkspaceId = {}) => {
  const url = workspaceId ? `${BASE_API_URL}/links?workspaceId=${workspaceId}` : `${BASE_API_URL}/links`;
  return await callApi<LinkSchema[]>({ method: "GET", url });
};

export const deleteShortLink = async ({ linkId, workspaceId }: { linkId: string } & WorkspaceId) => {
  const url = workspaceId
    ? `${BASE_API_URL}/links/${linkId}?workspaceId=${workspaceId}`
    : `${BASE_API_URL}/links/${linkId}`;
  return await callApi<DeleteLinkResponseBody>({ method: "DELETE", url });
};

/**
 * todo: Add commands and api(s) to create/manage tags in the workspace.
 */
export const getAllTags = async ({ workspaceId }: WorkspaceId = {}) => {
  const url = workspaceId ? `${BASE_API_URL}/tags?workspaceId=${workspaceId}` : `${BASE_API_URL}/tags`;
  return await callApi<TagSchema[]>({ method: "GET", url });
};
