import type { GoogleDoc } from "../types";
import { getAccessToken } from "./google-auth";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

interface CreateFileResponse {
  id: string;
  name: string;
  webViewLink: string;
}

export async function createDocument(
  title: string,
  folderId: string,
): Promise<GoogleDoc> {
  const accessToken = await getAccessToken();

  const metadata = {
    name: title,
    mimeType: "application/vnd.google-apps.document",
    parents: [folderId],
  };

  const response = await fetch(
    `${DRIVE_API_BASE}/files?fields=id,name,webViewLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create document: ${error}`);
  }

  const data = (await response.json()) as CreateFileResponse;

  return {
    id: data.id,
    name: data.name,
    webViewLink: data.webViewLink,
  };
}
