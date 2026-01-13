import { Clipboard, closeMainWindow, showToast, Toast } from "@raycast/api";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { getAccessToken } from "../oauth";
import type { DriveItem, PaginatedResult, SearchResult } from "../types";
import { BATCH_SIZE, DRIVE_ITEM_SELECT, getDrivePrefix, GRAPH_API_BASE, graphRequest } from "./client";

const SIMPLE_UPLOAD_LIMIT = 4 * 1024 * 1024; // 4MB
const CHUNK_SIZE = 327680; // 320KB chunks for resumable upload

// ============================================================================
// THUMBNAILS
// ============================================================================

interface BatchRequest {
  id: string;
  method: string;
  url: string;
}

interface BatchResponse {
  responses: Array<{
    id: string;
    status: number;
    body: {
      value?: Array<{
        id: string;
        small?: { url: string };
        medium?: { url: string };
        large?: { url: string };
      }>;
    };
  }>;
}

/**
 * Batch request to get thumbnails for multiple items efficiently
 */
async function batchResolveThumbnails(items: DriveItem[]): Promise<void> {
  const itemsNeedingResolution = items.filter((item) => {
    if (!item.thumbnails || item.thumbnails.length === 0) return false;
    const thumbnail = item.thumbnails[0];
    return (
      (thumbnail.small?.url && thumbnail.small.url.includes("my.microsoftpersonalcontent.com")) ||
      (thumbnail.medium?.url && thumbnail.medium.url.includes("my.microsoftpersonalcontent.com")) ||
      (thumbnail.large?.url && thumbnail.large.url.includes("my.microsoftpersonalcontent.com"))
    );
  });

  if (itemsNeedingResolution.length === 0) return;

  for (let i = 0; i < itemsNeedingResolution.length; i += BATCH_SIZE) {
    const batch = itemsNeedingResolution.slice(i, i + BATCH_SIZE);

    const batchRequests: BatchRequest[] = batch.map((item, index) => {
      const driveId = item.parentReference?.driveId;
      const drivePrefix = driveId ? `/drives/${driveId}` : "/me/drive";
      return {
        id: `${index}`,
        method: "GET",
        url: `${drivePrefix}/items/${item.id}/thumbnails`,
      };
    });

    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`${GRAPH_API_BASE}/$batch`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests: batchRequests }),
      });

      if (!response.ok) {
        console.error(`Batch request failed: ${response.status} ${response.statusText}`);
        continue;
      }

      const batchResult = (await response.json()) as BatchResponse;

      batchResult.responses.forEach((batchResponse) => {
        const itemIndex = parseInt(batchResponse.id);
        const item = batch[itemIndex];

        if (batchResponse.status === 200 && batchResponse.body?.value && batchResponse.body.value.length > 0) {
          const thumbnailSet = batchResponse.body.value[0];

          if (item.thumbnails && item.thumbnails[0]) {
            if (thumbnailSet.small?.url) {
              item.thumbnails[0].small!.url = thumbnailSet.small.url;
            }
            if (thumbnailSet.medium?.url) {
              item.thumbnails[0].medium!.url = thumbnailSet.medium.url;
            }
            if (thumbnailSet.large?.url) {
              item.thumbnails[0].large!.url = thumbnailSet.large.url;
            }
          }
        }
      });
    } catch (error) {
      console.error("Error processing batch:", error);
    }
  }
}

// ============================================================================
// LISTING & SEARCH
// ============================================================================

/**
 * Get all files from OneDrive or SharePoint drive root folder
 */
export async function getRootFiles(driveId?: string): Promise<PaginatedResult> {
  try {
    const endpoint = `${getDrivePrefix(driveId)}/root/children?$orderby=name asc&${DRIVE_ITEM_SELECT}`;
    const response = await graphRequest(endpoint);
    const data = (await response.json()) as SearchResult;
    return {
      items: data.value || [],
      nextLink: data["@odata.nextLink"],
    };
  } catch (error) {
    console.error("Get root files error:", error);
    return { items: [] };
  }
}

/**
 * Search for files across OneDrive and SharePoint
 */
export async function searchFiles(
  query: string,
  driveId?: string,
  sortOption: "relevance" | "lastModifiedDateTime" = "relevance",
): Promise<PaginatedResult> {
  if (!query || query.trim().length === 0) {
    return getRootFiles(driveId);
  }

  try {
    // Relevance uses Microsoft Graph's default ranking, lastModifiedDateTime sorts by date
    const orderByParam = sortOption === "relevance" ? "" : "$orderby=lastModifiedDateTime desc&";
    // Escape single quotes for OData syntax before encoding
    const escapedQuery = encodeURIComponent(query.replace(/'/g, "''"));
    const endpoint = `${getDrivePrefix(driveId)}/root/search(q='${escapedQuery}')?${orderByParam}${DRIVE_ITEM_SELECT}`;
    const response = await graphRequest(endpoint);
    const data = (await response.json()) as SearchResult;

    const items = data.value || [];
    await batchResolveThumbnails(items);

    return {
      items,
      nextLink: data["@odata.nextLink"],
    };
  } catch (error) {
    console.error("Search error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Search Failed",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
    return { items: [] };
  }
}

/**
 * Get metadata for a specific folder item
 */
export async function getFolderItem(folderId: string, driveId?: string): Promise<DriveItem | null> {
  try {
    const endpoint = `${getDrivePrefix(driveId)}/items/${folderId}?${DRIVE_ITEM_SELECT}`;
    const response = await graphRequest(endpoint);
    const data = (await response.json()) as DriveItem;
    return data;
  } catch (error) {
    console.error("Get folder item error:", error);
    return null;
  }
}

/**
 * Get contents of a specific folder by ID
 */
export async function getFolderContents(folderId: string, driveId?: string): Promise<PaginatedResult> {
  try {
    const endpoint = `${getDrivePrefix(driveId)}/items/${folderId}/children?$orderby=name asc&${DRIVE_ITEM_SELECT}`;
    const response = await graphRequest(endpoint);
    const data = (await response.json()) as SearchResult;
    return {
      items: data.value || [],
      nextLink: data["@odata.nextLink"],
    };
  } catch (error) {
    console.error("Get folder contents error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Load Folder",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
    return { items: [] };
  }
}

/**
 * Load next page of results using @odata.nextLink
 */
export async function loadNextPage(nextLink: string): Promise<PaginatedResult> {
  try {
    const url = new URL(nextLink);
    const endpoint = url.pathname.replace("/v1.0", "") + url.search;

    const response = await graphRequest(endpoint);
    const data = (await response.json()) as SearchResult;
    const items = data.value || [];

    if (endpoint.includes("/search(")) {
      await batchResolveThumbnails(items);
    }

    return {
      items,
      nextLink: data["@odata.nextLink"],
    };
  } catch (error) {
    console.error("Load next page error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Load More",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
    return { items: [] };
  }
}

/**
 * Get parent folder webUrl for an item
 */
export async function getParentFolderUrl(item: DriveItem): Promise<string> {
  if (!item.parentReference?.id || !item.parentReference?.driveId) {
    return item.webUrl;
  }

  try {
    const endpoint = `/drives/${item.parentReference.driveId}/items/${item.parentReference.id}?$select=webUrl`;
    const response = await graphRequest(endpoint);
    const data = (await response.json()) as { webUrl: string };
    return data.webUrl;
  } catch (error) {
    console.error("Error getting parent folder URL:", error);
    return item.webUrl;
  }
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

/**
 * Delete a file from OneDrive/SharePoint
 */
export async function deleteFile(item: DriveItem): Promise<boolean> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Deleting…",
    message: item.name,
  });

  try {
    const driveId = item.parentReference?.driveId;
    const endpoint = `${getDrivePrefix(driveId)}/items/${item.id}`;
    await graphRequest(endpoint, { method: "DELETE" });

    toast.style = Toast.Style.Success;
    toast.title = "Deleted";
    toast.message = `${item.name} has been deleted`;
    return true;
  } catch (error) {
    console.error("Delete error:", error);
    toast.style = Toast.Style.Failure;
    toast.title = "Delete Failed";
    toast.message = error instanceof Error ? error.message : "Unknown error occurred";
    return false;
  }
}

/**
 * Download a file to the Downloads folder
 */
export async function downloadFile(item: DriveItem): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Downloading…",
    message: item.name,
  });

  try {
    let downloadUrl = item["@microsoft.graph.downloadUrl"];

    if (!downloadUrl) {
      const driveId = item.parentReference?.driveId;
      const endpoint = `${getDrivePrefix(driveId)}/items/${item.id}?select=@microsoft.graph.downloadUrl`;
      const response = await graphRequest(endpoint);
      const data = (await response.json()) as { "@microsoft.graph.downloadUrl"?: string };
      downloadUrl = data["@microsoft.graph.downloadUrl"];
    }

    if (!downloadUrl) {
      throw new Error("Download URL not available");
    }

    const fileResponse = await fetch(downloadUrl);
    if (!fileResponse.ok) {
      throw new Error(`Download failed: ${fileResponse.statusText}`);
    }

    const contentLength = fileResponse.headers.get("content-length");
    const totalBytes = contentLength ? parseInt(contentLength, 10) : null;

    if (!fileResponse.body) {
      throw new Error("Response body is null");
    }

    const reader = fileResponse.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      receivedBytes += value.length;

      if (totalBytes) {
        const progress = Math.round((receivedBytes / totalBytes) * 100);
        toast.message = `${progress}% complete`;
      }
    }

    const buffer = new Uint8Array(receivedBytes);
    let position = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, position);
      position += chunk.length;
    }

    let downloadsPath = path.join(os.homedir(), "Downloads", item.name);

    let counter = 1;
    while (
      await fs
        .access(downloadsPath)
        .then(() => true)
        .catch(() => false)
    ) {
      const ext = path.extname(item.name);
      const nameWithoutExt = path.basename(item.name, ext);
      downloadsPath = path.join(os.homedir(), "Downloads", `${nameWithoutExt} (${counter})${ext}`);
      counter++;
    }

    await fs.writeFile(downloadsPath, Buffer.from(buffer));

    toast.style = Toast.Style.Success;
    toast.title = "Download Complete";
    toast.message = "File downloaded successfully";
  } catch (error) {
    console.error("Download error:", error);
    toast.style = Toast.Style.Failure;
    toast.title = "Download Failed";
    toast.message = error instanceof Error ? error.message : "Unknown error occurred";
  }
}

/**
 * Upload files to a folder in OneDrive/SharePoint
 */
export async function uploadFiles(
  filePaths: string[],
  destinationFolder: DriveItem,
  driveId: string,
): Promise<boolean> {
  const totalFiles = filePaths.length;
  const fileNames = filePaths.map((fp) => path.basename(fp)).join(", ");
  const displayMessage = totalFiles === 1 ? fileNames : `${totalFiles} files`;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Uploading…",
    message: displayMessage,
  });

  try {
    const fileSizes = await Promise.all(
      filePaths.map(async (filePath) => {
        const stats = await fs.stat(filePath);
        return stats.size;
      }),
    );
    const totalBytes = fileSizes.reduce((sum, size) => sum + size, 0);
    let uploadedBytes = 0;

    for (const filePath of filePaths) {
      const fileName = path.basename(filePath);
      const fileContent = await fs.readFile(filePath);
      const fileSize = fileContent.length;

      const drivePrefix = getDrivePrefix(driveId);
      const folderPath = destinationFolder.id === "root" ? "/root" : `/items/${destinationFolder.id}`;

      if (fileSize < SIMPLE_UPLOAD_LIMIT) {
        const endpoint = `${drivePrefix}${folderPath}:/${encodeURIComponent(fileName)}:/content`;
        await graphRequest(endpoint, {
          method: "PUT",
          body: fileContent,
          headers: { "Content-Type": "application/octet-stream" },
        });
        uploadedBytes += fileSize;
      } else {
        // Resumable upload for large files
        const sessionEndpoint = `${drivePrefix}${folderPath}:/${encodeURIComponent(fileName)}:/createUploadSession`;
        const sessionResponse = await graphRequest(sessionEndpoint, {
          method: "POST",
          body: JSON.stringify({ item: { "@microsoft.graph.conflictBehavior": "rename" } }),
        });
        const session = (await sessionResponse.json()) as { uploadUrl: string };

        for (let i = 0; i < fileSize; i += CHUNK_SIZE) {
          const chunk = fileContent.slice(i, Math.min(i + CHUNK_SIZE, fileSize));
          await fetch(session.uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Range": `bytes ${i}-${i + chunk.length - 1}/${fileSize}`,
              "Content-Length": chunk.length.toString(),
            },
            body: chunk,
          });
          uploadedBytes += chunk.length;
          const progress = Math.round((uploadedBytes / totalBytes) * 100);
          toast.message = `${progress}% complete`;
        }
      }

      const progress = Math.round((uploadedBytes / totalBytes) * 100);
      toast.message = `${progress}% complete`;
    }

    toast.style = Toast.Style.Success;
    toast.title = "Upload Complete";
    toast.message = `${totalFiles} file${totalFiles > 1 ? "s" : ""} uploaded successfully`;
    return true;
  } catch (error) {
    console.error("Upload error:", error);
    toast.style = Toast.Style.Failure;
    toast.title = "Upload Failed";
    toast.message = error instanceof Error ? error.message : "Unknown error occurred";
    return false;
  }
}

/**
 * Create a sharing link for a file or folder
 */
export async function createShareLink(
  item: DriveItem,
  type: "edit" | "view",
  scope: "anonymous" | "organization",
  expirationDays?: number,
): Promise<string | null> {
  await closeMainWindow();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Creating share link…",
    message: item.name,
  });

  try {
    const driveId = item.parentReference?.driveId;
    const endpoint = `${getDrivePrefix(driveId)}/items/${item.id}/createLink`;

    const requestBody: {
      type: string;
      scope: string;
      expirationDateTime?: string;
    } = {
      type,
      scope,
    };

    if (expirationDays !== undefined) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + expirationDays);
      requestBody.expirationDateTime = expirationDate.toISOString();
    }

    const response = await graphRequest(endpoint, {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    const data = (await response.json()) as { link: { webUrl: string } };
    const shareUrl = data.link.webUrl;

    await Clipboard.copy(shareUrl);

    toast.style = Toast.Style.Success;
    toast.title = "Copied to Clipboard";

    return shareUrl;
  } catch (error) {
    console.error("Create share link error:", error);
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to create share link";
    return null;
  }
}
