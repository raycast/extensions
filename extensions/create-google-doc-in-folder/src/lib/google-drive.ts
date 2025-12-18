import type { DriveFilesResponse, GoogleFolder } from "../types";
import { getAccessToken } from "./google-auth";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

export async function listFolders(query?: string): Promise<GoogleFolder[]> {
  const accessToken = await getAccessToken();

  // Build the query to search for folders
  let q = "mimeType='application/vnd.google-apps.folder' and trashed=false";
  if (query) {
    q += ` and name contains '${query.replace(/'/g, "\\'")}'`;
  }

  const params = new URLSearchParams({
    q,
    fields: "files(id,name,mimeType),nextPageToken",
    pageSize: "50",
    orderBy: "modifiedTime desc",
  });

  const response = await fetch(`${DRIVE_API_BASE}/files?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list folders: ${error}`);
  }

  const data = (await response.json()) as DriveFilesResponse;
  return data.files ?? [];
}

export async function getFolderDetails(
  folderId: string,
): Promise<GoogleFolder | null> {
  const accessToken = await getAccessToken();

  const params = new URLSearchParams({
    fields: "id,name,mimeType",
  });

  const response = await fetch(
    `${DRIVE_API_BASE}/files/${folderId}?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const error = await response.text();
    throw new Error(`Failed to get folder details: ${error}`);
  }

  return (await response.json()) as GoogleFolder;
}

export async function getFoldersByIds(
  folderIds: string[],
): Promise<GoogleFolder[]> {
  const folders: GoogleFolder[] = [];

  for (const id of folderIds) {
    const folder = await getFolderDetails(id);
    if (folder) {
      folders.push(folder);
    }
  }

  return folders;
}
