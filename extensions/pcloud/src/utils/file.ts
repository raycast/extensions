import { IFile, PcloudFileResponse, PcloudSearchResponse } from "../types/file";
import { type Response } from "@raycast/utils";
import { formatBytes, getIconForFile, getTagForFile } from "./utils";

export type PCloudPaginatedResponse = { items: IFile[]; total: number };
type PcloudResponseUtils = {
  getFilePath: (folderId: number, fileName: string) => Promise<string>;
};
export const mapPcloudFileResponseToFile = async (response: PcloudFileResponse, utils: PcloudResponseUtils) => {
  const { getFilePath } = utils;
  const filePath = await getFilePath(response.parentfolderid, response.name);
  const tag = getTagForFile(response.name, response.isfolder);
  const icon = getIconForFile(response.name, response.isfolder);
  return {
    id: response.id,
    icon,
    name: response.name,
    path: filePath,
    title: {
      value: response.name,
      tooltip: filePath,
    },
    accessories: [
      {
        date: response.modified ? new Date(response.modified) : undefined,
      },
      {
        tag: response.isfolder ? "" : formatBytes(response.size),
      },
      {
        tag,
      },
    ],
    context: response,
  } satisfies IFile;
};

export async function parsePcloudResponse(
  response: Response,
  utils: PcloudResponseUtils
): Promise<PCloudPaginatedResponse> {
  const json = (await response.json()) as PcloudSearchResponse;

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  if (!json.items) {
    return { items: [], total: 0 };
  }

  return {
    items: await Promise.all(json.items.map(async (v) => await mapPcloudFileResponseToFile(v, utils))),
    total: json.total,
  };
}
