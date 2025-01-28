/**
 * API client for interacting with the Memos backend service.
 * Provides functions for CRUD operations on memos, comments, and resources.
 */

import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { MemoInfoResponse, Resource, ROW_STATUS } from "./types";
import fs from "fs";

interface Preferences {
  apiKey: string;
  baseUrl: string;
  uid: string;
}

const preferences = getPreferenceValues<Preferences>();

/**
 * Constructs a full API request URL by combining the base URL with the given path
 */
export function getRequestUrl(path: string): string {
  const baseUrl = preferences.baseUrl.replace(/\/$/, "");
  const cleanPath = path.replace(/^\/+/, "").replace(/\/+$/, "");
  return `${baseUrl}/${cleanPath}`;
}

interface MemoResponse {
  memos: MemoInfoResponse[];
}

/**
 * Fetches all memos for the current user, optionally including archived ones
 * Also loads associated resources for each memo
 */
export async function getAllMemos(showArchived = false) {
  const cleanUid = preferences.uid.trim();

  const queryParams = new URLSearchParams({
    pageSize: "100",
    filter: `creator == 'users/${cleanUid}'`,
  }).toString();

  const url = getRequestUrl(`/api/v1/memos?${queryParams}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${preferences.apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("API Error:", errorText);
    throw new Error(`Failed to fetch memos: ${errorText}`);
  }

  const data = (await response.json()) as MemoResponse;

  if (data.memos && Array.isArray(data.memos)) {
    // Lade Ressourcen für jedes Memo
    const memosWithResources = await Promise.all(
      data.memos.map(async (memo) => {
        try {
          const resourcesUrl = getRequestUrl(`/api/v1/${memo.name}/resources`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const resourcesResponse = await fetch(resourcesUrl, {
            headers: {
              Authorization: `Bearer ${preferences.apiKey}`,
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (resourcesResponse.ok) {
            const resourcesData = (await resourcesResponse.json()) as { resources: Resource[] };
            return { ...memo, resources: resourcesData.resources || [] };
          }
        } catch (error) {
          console.warn(`Failed to fetch resources for memo ${memo.name}:`, error);
        }
        return { ...memo, resources: [] };
      }),
    );

    return memosWithResources.filter((memo) => showArchived || memo.rowStatus === ROW_STATUS.ACTIVE);
  }

  return [];
}

/**
 * Archives a memo by its unique identifier
 */
export async function archiveMemo(uid: string) {
  const response = await fetch(getRequestUrl(`/api/v1/memos/${uid}/archive`), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${preferences.apiKey}`,
      "Content-Type": "application/json",
    },
  });

  return response.ok;
}

/**
 * Restores a previously archived memo
 */
export async function restoreMemo(uid: string) {
  const response = await fetch(getRequestUrl(`/api/v1/memos/${uid}/restore`), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${preferences.apiKey}`,
      "Content-Type": "application/json",
    },
  });

  return response.ok;
}

/**
 * Permanently deletes a memo by its name
 */
export async function deleteMemo(name: string) {
  const url = getRequestUrl(`/api/v1/${name}`);
  console.log("Deleting memo:", { name, url });

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${preferences.apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Delete failed:", errorText);
    throw new Error(`Failed to delete memo: ${errorText}`);
  }

  return response.ok;
}

interface UpdateMemoRequest {
  content?: string;
  visibility?: "PUBLIC" | "PROTECTED" | "PRIVATE";
  pinned?: boolean;
  rowStatus?: "ACTIVE" | "ARCHIVED";
}

/**
 * Updates an existing memo with new content, visibility, pin status, or row status
 */
export async function updateMemo(name: string, updates: UpdateMemoRequest) {
  const url = getRequestUrl(`/api/v1/${name}`);
  console.log("Updating memo:", {
    name,
    url,
    updates,
  });

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${preferences.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Update failed:", errorText);
    throw new Error(`Failed to update memo: ${errorText}`);
  }

  return response.json();
}

interface CreateCommentRequest {
  content: string;
  visibility?: "PUBLIC" | "PROTECTED" | "PRIVATE";
  resources?: Resource[];
}

/**
 * Creates a new comment on an existing memo
 */
export async function createComment(memoName: string, comment: CreateCommentRequest) {
  const url = getRequestUrl(`/api/v1/${memoName}/comments`);
  console.log("Creating comment:", {
    memoName,
    url,
    comment,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${preferences.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(comment),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Comment creation failed:", errorText);
    throw new Error(`Failed to create comment: ${errorText}`);
  }

  return response.json();
}

interface ResourceResponse {
  id: string;
  name: string;
  filename: string;
  type: string;
  size: string;
}

/**
 * Uploads a file as a resource and returns the resource metadata
 * Converts the file to base64 before sending
 */
export async function uploadResource(filePath: string, fileName: string, mimeType: string): Promise<ResourceResponse> {
  try {
    // Read file content and convert to base64
    const fileContent = fs.readFileSync(filePath);
    const base64Content = fileContent.toString("base64");

    const resourceData = {
      filename: fileName,
      type: mimeType,
      content: base64Content,
    };

    const response = await fetch(getRequestUrl("/api/v1/resources"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${preferences.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resourceData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Upload failed:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`Failed to upload resource: ${errorText}`);
    }

    const data = await response.json();
    console.log("Upload response:", data);
    return data as ResourceResponse;
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
}

interface CreateMemoRequest {
  content: string;
  visibility?: "PUBLIC" | "PROTECTED" | "PRIVATE";
  resources?: { name: string }[]; // Format: resources/{id}
}

/**
 * Creates a new memo with optional visibility settings and attached resources
 */
export async function createMemo(memo: CreateMemoRequest) {
  console.log("Creating memo with:", memo);
  const response = await fetch(getRequestUrl("/api/v1/memos"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${preferences.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(memo),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create memo: ${errorText}`);
  }

  return response.json();
}

/**
 * Determines the MIME type of a file based on its extension
 * Falls back to application/octet-stream if the extension is unknown
 */
export function getMimeType(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  const mimeTypes: { [key: string]: string } = {
    txt: "text/plain",
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    zip: "application/zip",
    md: "text/markdown",
  };

  return mimeTypes[extension] || "application/octet-stream";
}
