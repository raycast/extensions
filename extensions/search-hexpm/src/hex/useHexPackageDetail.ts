import { showToast, ToastStyle } from "@raycast/api";
import fetch from "node-fetch";
import type { HexSearchResult, HexDetailResponse } from "./types";

export const useHexPackageDetail = async (item: HexSearchResult): Promise<HexDetailResponse> => {
  const [latestRelease] = item.releases;

  try {
    const response = await fetch(latestRelease.url);
    const jsonResponse = await response.json();
    return jsonResponse as HexDetailResponse;
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Couldn't retrieve package details!");
    return Promise.resolve({} as HexDetailResponse);
  }
};
