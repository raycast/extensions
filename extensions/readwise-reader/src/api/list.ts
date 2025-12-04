import { showToast, Toast } from "@raycast/api";
import { Document } from "../utils/document";
import { useDefaultHeaders } from "./headers";
import fetch from "node-fetch";

type ApiResponse = {
  count: number;
  nextPageCursor?: string;
  results: Document[];
};

export async function list(location: Document["location"], cursor?: string): Promise<ApiResponse> {
  const readerAPI = `https://readwise.io/api/v3/list?${new URLSearchParams({
    location,
    ...(cursor ? { pageCursor: cursor } : {}),
  }).toString()}`;

  const headers = useDefaultHeaders();

  const response = await fetch(readerAPI, {
    method: "GET",
    headers: headers,
  });

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("Retry-After"));
    if (!isNaN(retryAfter)) {
      await showToast({
        message: "The API call has been rate limited, it will restart shortly",
        title: "Rate limit",
        style: Toast.Style.Animated,
      });
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000)); // wait for x seconds
      return list(location, cursor); // send new request
    } else {
      throw new Error("Invalid Retry-After header value");
    }
  }

  return (await response.json()) as ApiResponse;
}
