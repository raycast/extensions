import { fetchWithAuth } from "../apis";
import { getApiConfig } from "./config";

export async function getScreenshot(id: string) {
  const { apiUrl, apiKey } = await getApiConfig();
  const encodedUrl = encodeURIComponent(`/api/assets/${id}`);
  const imageUrl = `${apiUrl}/_next/image?url=${encodedUrl}&w=1200&q=75`;

  // hack: Make an authenticated image URL request in the background to display the image in Raycast.
  await fetchWithAuth(imageUrl, {
    headers: {
      Accept: "image/*",
      Authorization: `Bearer ${apiKey}`,
    },
  });

  return imageUrl;
}
