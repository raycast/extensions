import { getPreferenceValues } from "@raycast/api";

export const API_URL = (keyword: string, port: number): string => {
  return `http://127.0.0.1:${port}/search?query=${keyword}*&fields=id,title,body&token=${API_Token}`;
};

export const API_Token = getPreferenceValues().joplin_token;

export const RaycastBundleId = "com.raycast.macos";

export const JoplinBundleId = "net.cozic.joplin-desktop";
