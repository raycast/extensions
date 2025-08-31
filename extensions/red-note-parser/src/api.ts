import fs from "node:fs";
import path from "node:path";
import got from "got";
import { UserInfo, BaseResponse, NoteRequest, NoteInfo } from "./types.js";
import { API_URL } from "./constants.js";

/**
 * Get my info(Verify cookie is valid)
 * @param cookie cookie
 * @returns User info
 */
export const getMeApi = async (cookie: string) => {
  const url = `${API_URL}/sns/web/v2/user/me`;
  const response = await got
    .get(url, {
      headers: {
        Cookie: cookie,
      },
    })
    .json<BaseResponse<UserInfo>>();
  if (response.code !== 0) {
    throw new Error(response.message);
  }
  return response.data;
};

/**
 * Get note info
 * @param data data
 * @param headers headers
 * @returns note info
 */
export const getNoteApi = async (data: NoteRequest, headers: Record<string, string>) => {
  const url = `${API_URL}/sns/web/v1/feed`;
  const response = await got
    .post(url, {
      headers,
      json: data,
    })
    .json<BaseResponse<NoteInfo>>();
  if (response.code !== 0) {
    throw new Error(response.message);
  }
  return response.data;
};

/**
 * Download asset
 * @param url image/video url
 * @param dir directory
 * @returns destination
 */
export const downloadAssetApi = async (url: string, dir: string) => {
  const file = await got(url).buffer();
  const filename = url.split("/").pop() || Date.now().toString();
  const destinationFile = path.join(dir, `${filename}`);
  fs.writeFileSync(destinationFile, file);
};
