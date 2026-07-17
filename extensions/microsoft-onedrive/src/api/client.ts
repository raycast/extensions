import { getAccessToken } from "../oauth";

export const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";
export const BATCH_SIZE = 20; // Microsoft Graph API limit for $batch

// Common fields for DriveItem queries
export const DRIVE_ITEM_FIELDS = [
  "id",
  "name",
  "size",
  "webUrl",
  "webDavUrl",
  "createdDateTime",
  "lastModifiedDateTime",
  "folder",
  "file",
  "parentReference",
  "createdBy",
  "lastModifiedBy",
  "thumbnails",
  "image",
  "photo",
  "video",
  "location",
].join(",");

export const DRIVE_ITEM_SELECT = `$expand=thumbnails&$select=${DRIVE_ITEM_FIELDS}`;

/**
 * Build drive prefix for API endpoints
 */
export function getDrivePrefix(driveId?: string): string {
  return driveId ? `/drives/${driveId}` : "/me/drive";
}

/**
 * Make an authenticated request to Microsoft Graph API
 */
export async function graphRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${GRAPH_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error (${endpoint}):`, errorText);
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response;
}
