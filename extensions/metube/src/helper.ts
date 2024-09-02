import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

interface AddToQueueResponse {
  status: string;
  msg?: string;
}

interface Preferences {
  metubeUrl: string;
  quality: string;
  format: string;
}

export async function addToQueue(
  url: string,
  quality: string | null = null,
  format: string | null = null,
): Promise<AddToQueueResponse> {
  const preferences = getPreferenceValues<Preferences>();
  quality = quality ?? preferences.quality;
  format = format ?? preferences.format;

  const metubeUrl = `${preferences.metubeUrl}/add`;

  const body = JSON.stringify({ url, quality, format });
  const response = await fetch(metubeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });
  return response.json() as Promise<AddToQueueResponse>;
}

// export async function getHistory() {
//   const response = await fetch("http://localhost:8081/history");
//   return response.json();
// }
