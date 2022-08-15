import fetch from "node-fetch";
import { getOAuthToken } from "../components/withGoogleAuth";

type UpdateFilePayload = Partial<{
  starred: boolean;
  trashed: boolean;
}>;

export async function updateFile(fileId: string, payload: UpdateFilePayload) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getOAuthToken()}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error(`Update file ${fileId} error: ${await response.text()}`, payload);
    throw new Error(response.statusText);
  }

  return response.json();
}
