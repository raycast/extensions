import { getPreferenceValues } from "@raycast/api";

export const SEARCH_API_URL = (keyword: string, port: number): string => {
  return `http://127.0.0.1:${port}/search?query=${keyword}*&fields=id,title&token=${API_Token}&type=note&limit=${SearchLimit}`;
};

export const DETAIL_API_URL = (id: string, port: number): string => {
  return `http://127.0.0.1:${port}/notes/${id}?fields=id,title,body&token=${API_Token}`;
};

export const API_Token = getPreferenceValues().joplin_token;

export const SearchLimit = getPreferenceValues().search_limit || 9;

export const RaycastBundleId = "com.raycast.macos";

export const JoplinBundleId = "net.cozic.joplin-desktop";
