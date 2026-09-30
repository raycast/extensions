import axios, { AxiosRequestConfig } from "axios";
import { BASE_API_URL } from "@utils/constants";
import { apiKey, commandName, extensionName } from "@utils/env";
import { DeleteItemResponseBody, ItemSchema, TagSchema, WorkspaceId, WorkspaceSchema } from "@/types";
import { captureException } from "@raycast/api";

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

export const createItem = async ({
  sku,
  description,
  cost,
  supplier,
  workspaceId,
  tagIds,
}: { sku: string; description: string; cost: number; supplier: string; tagIds?: string[] } & WorkspaceId) => {
  return await callApi<ItemSchema>({
    method: "POST",
    url: `${BASE_API_URL}/items?workspaceId=${workspaceId}`,
    data: { sku, description, cost, supplier, tagIds },
  });
};

export const getAllItems = async ({ workspaceId }: WorkspaceId) => {
  return await callApi<ItemSchema[]>({ method: "GET", url: `${BASE_API_URL}/items?workspaceId=${workspaceId}` });
};

export const deleteItem = async ({ itemId, workspaceId }: { itemId: string } & WorkspaceId) => {
  return await callApi<DeleteItemResponseBody>({
    method: "DELETE",
    url: `${BASE_API_URL}/items/${itemId}?workspaceId=${workspaceId}`,
  });
};

/**
 * todo: Add commands and api(s) to create/manage tags in the workspace.
 */
export const getAllTags = async ({ workspaceId }: WorkspaceId) => {
  return await callApi<TagSchema[]>({ method: "GET", url: `${BASE_API_URL}/tags?workspaceId=${workspaceId}` });
};
