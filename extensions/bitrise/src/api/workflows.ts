import fetch from "node-fetch";
import { getToken } from ".";
import { AppSlug, ApiResponse } from "./types";

export async function fetchWorkflows(appSlug: AppSlug): Promise<string[]> {
  const url = `https://api.bitrise.io/v0.1/apps/${appSlug}/build-workflows`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: getToken(),
    },
  });

  const apiResponse = (await response.json()) as ApiResponse<string[]>;
  if (apiResponse.message) {
    console.error(url);
    throw new Error(apiResponse.message);
  }

  return apiResponse.data;
}
