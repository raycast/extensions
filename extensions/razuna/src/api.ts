import fetch from "node-fetch";
import FormData from "form-data";
import { readFileSync } from "fs";
import { getPreferences, getApiUrl } from "./types";
import type {
  RazunaFile,
  RazunaFolder,
  RazunaWorkspace,
  SearchResult,
  WorkspacesResponse,
  FolderTreeResponse,
  FolderTreeNode,
  FilesResponse,
  SearchApiResponse,
  UploadResponse,
} from "./types";

class RazunaAPI {
  private getHeaders(): Record<string, string> {
    const { access_token } = getPreferences();
    return {
      "x-access-token": access_token,
      "Content-Type": "application/json",
    };
  }

  private async makeRequest<T>(path: string, options: Record<string, unknown> = {}): Promise<T> {
    const url = getApiUrl(path);
    const headers = this.getHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers as Record<string, string>),
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  }

  async getWorkspaces(): Promise<RazunaWorkspace[]> {
    const response = await this.makeRequest<WorkspacesResponse>("/api/v1/files/workspaces/user");

    // Handle different response formats
    if (Array.isArray(response)) {
      return response;
    }

    if (response.results && Array.isArray(response.results)) {
      return response.results;
    }

    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }

    return [];
  }

  async getFolders(workspaceId: string): Promise<RazunaFolder[]> {
    const response = await this.makeRequest<FolderTreeResponse>(`/api/v1/files/workspace/getfoldertree/${workspaceId}`);

    // Always include root folder as an option
    const folders: RazunaFolder[] = [];

    // Handle different response formats
    if (Array.isArray(response)) {
      folders.push(...response);
      return folders;
    }

    if (response.results && Array.isArray(response.results)) {
      folders.push(...response.results);
      return folders;
    }

    if (response.data && Array.isArray(response.data)) {
      folders.push(...response.data);
      return folders;
    }

    // The getfoldertree endpoint returns a tree structure, not a flat array
    // We need to flatten it to a folder list for the dropdown
    if (response.results && typeof response.results === "object") {
      const treefolders = this.flattenFolderTree(response.results as FolderTreeResponse);
      folders.push(...treefolders);
      return folders;
    }

    return folders; // Return at least the root folder
  }
  private flattenFolderTree(tree: FolderTreeResponse, parentPath = "", depth = 0): RazunaFolder[] {
    const folders: RazunaFolder[] = [];

    for (const folderId in tree) {
      const folder = tree[folderId] as FolderTreeNode;
      if (folder.name) {
        // Check if this is the root folder (depth 0 and name contains "all files")
        const isRootFolder = depth === 0 && folder.name.toLowerCase().includes("all files");
        const folderPath = parentPath ? `${parentPath} / ${folder.name}` : folder.name;

        // Use the actual folder name for display, but show full path for nested folders
        const displayName = isRootFolder ? folder.name : depth > 0 ? folderPath : folder.name;

        folders.push({
          _id: folderId,
          name: displayName,
          parent_folder: parentPath || undefined,
          workspace: "", // Will be set by caller
          created_at: "",
          updated_at: "",
          path: displayName,
          depth: folder.depth || depth,
        });

        // Recursively process subfolders
        if (folder.subfolders) {
          const subfolders = this.flattenFolderTree(folder.subfolders, folderPath, depth + 1);
          folders.push(...subfolders);
        }
      }
    }

    return folders;
  }

  async getFolderContent(
    workspaceId: string,
    folderId?: string,
    page: number = 1,
    limit: number = 25,
  ): Promise<RazunaFolder> {
    try {
      // Use the correct endpoint from files_folder_api.js
      const queryParams = new URLSearchParams({
        workspace_id: workspaceId,
        page: page.toString(),
        limit: limit.toString(),
      });

      // Only add folder_id if it's provided (omit for root folder)
      if (folderId) {
        queryParams.append("folder_id", folderId);
      }

      const url = `/api/v1/files/folder/content?${queryParams.toString()}`;

      // Explicitly use GET method and make sure headers are sent
      const response = await this.makeRequest<FilesResponse>(url, {
        method: "GET",
      });

      // The _getFolderContent function returns { success: true, results: { files: [], total: 0 } }
      let files: RazunaFile[] = [];

      if (response && response.success && response.results) {
        if (Array.isArray(response.results)) {
          files = response.results;
        } else if (response.results.files && Array.isArray(response.results.files)) {
          files = response.results.files;
        }
      }

      // Transform the API response to match our RazunaFolder interface
      const folderContent: RazunaFolder = {
        _id: folderId || "root",
        name: folderId ? "Selected Folder" : "Root Folder",
        workspace: workspaceId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        files: files,
        children: [], // No nested folders in this view - we use dropdown for navigation
      };

      return folderContent;
    } catch {
      // Return empty folder structure on error
      return {
        _id: folderId || "root",
        name: folderId ? "Selected Folder" : "Root Folder",
        workspace: workspaceId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        files: [],
        children: [],
      };
    }
  }
  async searchFiles(query: string, workspaceId?: string, page: number = 1, limit: number = 25): Promise<SearchResult> {
    const body: Record<string, unknown> = {
      term: query,
      workspace_id: workspaceId,
      page: page,
      limit: limit,
    };

    const response = await this.makeRequest<SearchApiResponse>("/api/v1/files/search/semantic", {
      method: "POST",
      body: JSON.stringify(body),
    });

    // Handle the new search API response structure
    let files: RazunaFile[] = [];
    let total = 0;
    let actualPage = page;
    let perPage = limit;

    if (response && response.files && Array.isArray(response.files)) {
      // New direct response format: { files: [...], total: 146, page: 1, per_page: 25 }
      files = response.files;
      total = response.total || files.length;
      actualPage = response.page || page;
      perPage = response.per_page || limit;
    } else if (response && response.success && response.results) {
      // Fallback: older response structure with nested results
      if (Array.isArray(response.results)) {
        files = response.results;
        total = files.length;
      } else if (
        typeof response.results === "object" &&
        response.results.files &&
        Array.isArray(response.results.files)
      ) {
        files = response.results.files;
        total = response.results.total || files.length;
      }
    } else if (response && Array.isArray(response)) {
      // Fallback: direct array response (legacy)
      files = response;
      total = files.length;
    }

    return {
      files,
      total,
      page: actualPage,
      per_page: perPage,
    };
  }

  private getUploadLimit(workspace?: RazunaWorkspace): number {
    if (!workspace) {
      return 4 * 1024 * 1024 * 1024; // 4GB default
    }

    // If workspace has explicit upload limit, use it
    if (workspace.upload_limit) {
      return workspace.upload_limit;
    }

    // Otherwise determine by plan
    if (workspace.is_paid) {
      return 50 * 1024 * 1024 * 1024; // 50GB for paid
    } else {
      return 4 * 1024 * 1024 * 1024; // 4GB for free
    }
  }

  async uploadFile(
    filePath: string,
    workspaceId: string,
    folderId?: string,
    workspace?: RazunaWorkspace,
  ): Promise<RazunaFile> {
    const { access_token } = getPreferences();
    const url = getApiUrl("/api/v1/files/folder/upload");

    // Check file size before upload
    const { statSync } = await import("fs");
    const fileStats = statSync(filePath);
    const fileSizeInBytes = fileStats.size;
    const fileSizeInMB = fileSizeInBytes / (1024 * 1024);
    const fileSizeInGB = fileSizeInBytes / (1024 * 1024 * 1024);

    // Get upload limit based on workspace plan
    const uploadLimitBytes = this.getUploadLimit(workspace);
    const uploadLimitGB = uploadLimitBytes / (1024 * 1024 * 1024);

    if (fileSizeInBytes > uploadLimitBytes) {
      const planType = workspace?.is_paid ? "paid" : "free";
      throw new Error(
        `File size (${fileSizeInGB.toFixed(2)} GB) exceeds ${planType} workspace limit of ${uploadLimitGB.toFixed(2)} GB. ` +
          (workspace?.is_paid ? "" : "Upgrade to a paid plan for 50GB uploads."),
      );
    }

    const formData = new FormData();

    // Use streaming for large files (>100MB)
    if (fileSizeInMB > 100) {
      const { createReadStream } = await import("fs");
      const fileStream = createReadStream(filePath);
      formData.append("file", fileStream, { filename: filePath.split("/").pop() });
    } else {
      formData.append("file", readFileSync(filePath), { filename: filePath.split("/").pop() });
    }

    formData.append("workspace_id", workspaceId);

    if (folderId) {
      formData.append("folder_id", folderId);
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-access-token": access_token,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = (await response.json()) as UploadResponse;
    return (result.results?.[0] || result.file) as RazunaFile; // Handle array response from backend
  }
}

export const razunaAPI = new RazunaAPI();
