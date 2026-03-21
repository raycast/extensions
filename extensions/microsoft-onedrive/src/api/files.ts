import { Alert, Clipboard, closeMainWindow, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { getAccessToken } from "../oauth";
import type { DriveItem, PaginatedResult, SearchResult } from "../types";
import { BATCH_SIZE, DRIVE_ITEM_SELECT, getDrivePrefix, GRAPH_API_BASE, graphRequest } from "./client";

const SIMPLE_UPLOAD_LIMIT = 4 * 1024 * 1024; // 4MB
const CHUNK_SIZE = 327680; // 320KB chunks for resumable upload

interface FileToUpload {
  absolutePath: string;
  relativePath: string; // relative to the selected item (empty for direct files)
}

interface FolderInfo {
  id: string;
  name: string;
}

interface CollectedItems {
  files: FileToUpload[];
  emptyFolders: string[]; // relative paths of empty folders
}

/**
 * Convert path to use forward slashes (required by Graph API)
 */
function toApiPath(p: string): string {
  return p.replace(/\\/g, "/");
}

/**
 * Recursively collect all files and empty folders from a directory
 */
async function collectFilesRecursively(dirPath: string, basePath: string = ""): Promise<CollectedItems> {
  const files: FileToUpload[] = [];
  const emptyFolders: string[] = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  if (entries.length === 0 && basePath) {
    emptyFolders.push(basePath);
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    // Use forward slashes for Graph API compatibility (path.join uses \\ on Windows)
    const relativePath = basePath ? toApiPath(path.join(basePath, entry.name)) : entry.name;

    if (entry.isDirectory()) {
      const subItems = await collectFilesRecursively(fullPath, relativePath);
      files.push(...subItems.files);
      emptyFolders.push(...subItems.emptyFolders);
    } else if (entry.isFile()) {
      files.push({ absolutePath: fullPath, relativePath });
    }
  }

  return { files, emptyFolders };
}

/**
 * Create a folder in OneDrive, optionally renaming if it already exists
 */
async function ensureFolderExists(
  drivePrefix: string,
  parentFolderId: string,
  folderName: string,
  conflictBehavior: "replace" | "rename" = "replace",
): Promise<FolderInfo> {
  const parentPath = parentFolderId === "root" ? "/root" : `/items/${parentFolderId}`;
  const endpoint = `${drivePrefix}${parentPath}/children`;

  const response = await graphRequest(endpoint, {
    method: "POST",
    body: JSON.stringify({
      name: folderName,
      folder: {},
      "@microsoft.graph.conflictBehavior": conflictBehavior,
    }),
  });

  const folder = (await response.json()) as DriveItem;
  return { id: folder.id, name: folder.name };
}

/**
 * Ensure all folders in a path exist, creating them if needed
 * Returns the ID of the deepest folder
 */
async function ensureFolderPathExists(
  drivePrefix: string,
  rootFolderId: string,
  folderPath: string,
  folderCache: Map<string, string>,
): Promise<string> {
  if (!folderPath) return rootFolderId;

  const cacheKey = `${rootFolderId}/${folderPath}`;
  if (folderCache.has(cacheKey)) {
    return folderCache.get(cacheKey)!;
  }

  const parts = folderPath.split("/");
  let currentFolderId = rootFolderId;
  let currentPath = "";

  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    const partCacheKey = `${rootFolderId}/${currentPath}`;

    if (folderCache.has(partCacheKey)) {
      currentFolderId = folderCache.get(partCacheKey)!;
    } else {
      const folder = await ensureFolderExists(drivePrefix, currentFolderId, part);
      currentFolderId = folder.id;
      folderCache.set(partCacheKey, currentFolderId);
    }
  }

  return currentFolderId;
}

// ============================================================================
// CONFLICT HANDLING
// ============================================================================

/**
 * Check if an item with the given name exists in a folder.
 */
async function itemExistsInFolder(drivePrefix: string, folderId: string, itemName: string): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();
    const folderPath = folderId === "root" ? "/root" : `/items/${folderId}`;
    const endpoint = `${GRAPH_API_BASE}${drivePrefix}${folderPath}:/${encodeURIComponent(itemName)}:`;
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Rename paths that start with oldName to use newName instead
 */
function renamePaths(oldName: string, newName: string, files: FileToUpload[], folders: string[]): void {
  const prefix = oldName + "/";
  for (const file of files) {
    if (file.relativePath.startsWith(prefix) || file.relativePath === oldName) {
      file.relativePath = file.relativePath.replace(oldName, newName);
    }
  }
  for (let i = 0; i < folders.length; i++) {
    if (folders[i].startsWith(prefix) || folders[i] === oldName) {
      folders[i] = folders[i].replace(oldName, newName);
    }
  }
}

type ConflictResolution = "keep-both" | "stop";

/**
 * Prompt user for conflict resolution when files already exist
 */
async function promptConflictResolution(conflictingFiles: string[]): Promise<ConflictResolution> {
  const isSingle = conflictingFiles.length === 1;
  const message = isSingle
    ? `"${conflictingFiles[0]}" already exists in this location. Do you want to keep both versions?`
    : `${conflictingFiles.length} selected items already exist in this location. Do you want to keep both versions?`;

  const confirmed = await confirmAlert({
    title: isSingle ? "Item already exists" : "Items already exist",
    message,
    icon: Icon.Warning,
    primaryAction: {
      title: "Keep Both",
      style: Alert.ActionStyle.Default,
    },
    dismissAction: {
      title: "Stop",
    },
  });

  return confirmed ? "keep-both" : "stop";
}

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
 * @param folderId - Optional folder ID to limit search scope to that folder and its subfolders
 */
export async function searchFiles(
  query: string,
  driveId?: string,
  folderId?: string,
  sortOption: "relevance" | "lastModifiedDateTime" = "relevance",
): Promise<PaginatedResult> {
  if (!query || query.trim().length === 0) {
    return folderId ? getFolderContents(folderId, driveId) : getRootFiles(driveId);
  }

  try {
    // Relevance uses Microsoft Graph's default ranking, lastModifiedDateTime sorts by date
    const orderByParam = sortOption === "relevance" ? "" : "$orderby=lastModifiedDateTime desc&";
    // Escape single quotes for OData syntax before encoding
    const escapedQuery = encodeURIComponent(query.replace(/'/g, "''"));
    // Use folder-scoped search when folderId is provided, otherwise search from root
    const searchRoot = folderId ? `items/${folderId}` : "root";
    const endpoint = `${getDrivePrefix(driveId)}/${searchRoot}/search(q='${escapedQuery}')?${orderByParam}${DRIVE_ITEM_SELECT}`;
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
      title: "Search failed",
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
      title: "Failed to load folder",
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
      title: "Failed to load more",
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
    toast.title = "Delete failed";
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
    toast.title = "Download complete";
    toast.message = "File downloaded successfully";
  } catch (error) {
    console.error("Download error:", error);
    toast.style = Toast.Style.Failure;
    toast.title = "Download failed";
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
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Preparing upload…",
  });

  try {
    // Collect files and empty folders, expanding directories recursively
    const filesToUpload: FileToUpload[] = [];
    const emptyFoldersToCreate: string[] = [];
    const rootItems: { name: string; isDirectory: boolean }[] = [];

    for (const selectedPath of filePaths) {
      const stats = await fs.stat(selectedPath);
      const itemName = path.basename(selectedPath);

      if (stats.isDirectory()) {
        rootItems.push({ name: itemName, isDirectory: true });
        const collected = await collectFilesRecursively(selectedPath, itemName);
        filesToUpload.push(...collected.files);
        emptyFoldersToCreate.push(...collected.emptyFolders);
        if (collected.files.length === 0 && collected.emptyFolders.length === 0) {
          emptyFoldersToCreate.push(itemName);
        }
      } else {
        rootItems.push({ name: itemName, isDirectory: false });
        filesToUpload.push({ absolutePath: selectedPath, relativePath: "" });
      }
    }

    const totalFiles = filesToUpload.length;
    const totalEmptyFolders = emptyFoldersToCreate.length;
    const hasContent = totalFiles > 0 || totalEmptyFolders > 0;

    if (!hasContent) {
      toast.style = Toast.Style.Failure;
      toast.title = "Nothing to upload";
      toast.message = "No files or folders selected";
      return false;
    }

    const displayMessage =
      totalFiles > 0
        ? totalFiles === 1
          ? path.basename(filesToUpload[0].absolutePath)
          : `${totalFiles} files`
        : `${totalEmptyFolders} empty folder${totalEmptyFolders !== 1 ? "s" : ""}`;

    // Check for conflicts
    const drivePrefix = getDrivePrefix(driveId);
    const folderCache = new Map<string, string>();
    const conflictingItems: { name: string; isDirectory: boolean }[] = [];

    for (const item of rootItems) {
      const exists = await itemExistsInFolder(drivePrefix, destinationFolder.id, item.name);
      if (exists) {
        conflictingItems.push(item);
      }
    }

    if (conflictingItems.length > 0) {
      const resolution = await promptConflictResolution(conflictingItems.map((i) => i.name));
      if (resolution === "stop") {
        toast.hide();
        return false;
      }

      // Create conflicting folders with rename behavior and update paths
      // (files are renamed during upload with conflictBehavior=rename)
      for (const item of conflictingItems) {
        if (item.isDirectory) {
          const folder = await ensureFolderExists(drivePrefix, destinationFolder.id, item.name, "rename");
          if (folder.name !== item.name) {
            renamePaths(item.name, folder.name, filesToUpload, emptyFoldersToCreate);
          }
          folderCache.set(`${destinationFolder.id}/${folder.name}`, folder.id);
        }
      }
    }

    toast.title = "Uploading…";
    toast.message = displayMessage;

    // Calculate total size for progress
    const fileSizes = await Promise.all(
      filesToUpload.map(async (file) => {
        const stats = await fs.stat(file.absolutePath);
        return stats.size;
      }),
    );
    const totalBytes = fileSizes.reduce((sum, size) => sum + size, 0);
    let uploadedBytes = 0;

    for (let fileIndex = 0; fileIndex < filesToUpload.length; fileIndex++) {
      const file = filesToUpload[fileIndex];
      const fileName = path.basename(file.absolutePath);

      // Determine the target folder - create subfolders if needed
      let targetFolderId = destinationFolder.id;
      if (file.relativePath) {
        const folderPath = toApiPath(path.dirname(file.relativePath));
        if (folderPath && folderPath !== ".") {
          targetFolderId = await ensureFolderPathExists(drivePrefix, destinationFolder.id, folderPath, folderCache);
        }
      }

      const fileContent = await fs.readFile(file.absolutePath);
      const fileSize = fileContent.length;

      const itemPath = targetFolderId === "root" ? "/root" : `/items/${targetFolderId}`;

      if (fileSize < SIMPLE_UPLOAD_LIMIT) {
        const endpoint = `${drivePrefix}${itemPath}:/${encodeURIComponent(fileName)}:/content?@microsoft.graph.conflictBehavior=rename`;
        await graphRequest(endpoint, {
          method: "PUT",
          body: fileContent,
          headers: { "Content-Type": "application/octet-stream" },
        });
        uploadedBytes += fileSize;
        if (totalBytes > 0) {
          const progress = Math.round((uploadedBytes / totalBytes) * 100);
          toast.message = `${progress}% complete`;
        }
      } else {
        // Resumable upload for large files
        const sessionEndpoint = `${drivePrefix}${itemPath}:/${encodeURIComponent(fileName)}:/createUploadSession`;
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
          if (totalBytes > 0) {
            const progress = Math.round((uploadedBytes / totalBytes) * 100);
            toast.message = `${progress}% complete`;
          }
        }
      }
    }

    // Create empty folders
    for (const folderPath of emptyFoldersToCreate) {
      await ensureFolderPathExists(drivePrefix, destinationFolder.id, folderPath, folderCache);
    }

    toast.style = Toast.Style.Success;
    toast.title = "Upload complete";
    const itemCount = filesToUpload.length + emptyFoldersToCreate.length;
    toast.message = `${itemCount} item${itemCount !== 1 ? "s" : ""} uploaded successfully`;
    return true;
  } catch (error) {
    console.error("Upload error:", error);
    toast.style = Toast.Style.Failure;
    toast.title = "Upload failed";
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
