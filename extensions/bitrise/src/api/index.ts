import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { ApiResponse } from "./types";

export function getToken(): string {
  // Preference key is `apiKey` to keep it compatible with the old Bitrise extension
  const { apiKey } = getPreferenceValues();
  return apiKey;
}

export async function fetchPagedResource<T>(url: string): Promise<T[]> {
  const result: T[] = [];
  let nextAnchor: string | null = null;

  do {
    // Bitrise API limitation: max allowed `limit` is 50
    const pagedUrl = nextAnchor ? `${url}&limit=50&next=${nextAnchor}` : url;
    const response = await fetch(pagedUrl, {
      method: "GET",
      headers: {
        Authorization: getToken(),
      },
    });
    if (!response.ok) {
      throw new Error("HTTP error " + response.status);
    }

    const apiResponse = (await response.json()) as ApiResponse<T[]>;
    if (apiResponse.message) {
      console.info(apiResponse);
      console.info(pagedUrl);
      throw new Error(apiResponse.message);
    }

    result.push(...apiResponse.data);

    nextAnchor = apiResponse.paging.next;
    console.info(nextAnchor);
  } while (nextAnchor);

  return Promise.resolve(result);
}
