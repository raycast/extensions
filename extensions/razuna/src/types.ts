import { getPreferenceValues, LocalStorage } from "@raycast/api";

export interface Preferences {
  server_url: string;
  access_token: string;
}

export interface RazunaFile {
  _id: string;
  id: string;
  name: string;
  original_name: string;
  file_name: string;
  content_type: string;
  content_type_family: string;
  extension: string;
  size: number;
  size_human: string;
  short_id?: string;
  timestamp_display?: string;
  created_at?: string;
  updated_at?: string;
  checksum?: string;
  folder?: string;
  workspace?: string;
  url?: string;
  pixels?: string;
  has_thumbnail?: boolean;
  has_thumbnail_large?: boolean;
  description?: string;
  keywords?: string[];
  labels?: string[];
  labels_names?: string[];
  objects?: string[];
  people?: Array<{
    _id: string;
    age_range: string;
    ethnicity: string;
    eye_color: string;
    gender: string;
    hair_color: string;
    id: string;
  }>;
  people_age_range?: string[];
  people_ethnicity?: string[];
  people_eye_color?: string[];
  people_gender?: string[];
  people_hair_color?: string[];
  direct_links?: {
    url: string;
    url_dl: string;
    url_t: string;
    url_tl: string;
    url_dt: string;
    url_dtl: string;
    url_raw: string;
    url_pdf: string;
    domain: string;
  };
  urls?: {
    url: string;
    url_dl: string;
    url_t: string;
    url_tl: string;
    url_dt: string;
    url_dtl: string;
    url_raw: string;
    url_pdf: string;
    url_app_domain: string;
    domain: string;
  };
  audit_info?: {
    created_date: string;
    modified_date: string;
  };
}

export interface RazunaFolder {
  _id: string;
  name: string;
  parent_folder?: string;
  workspace: string;
  created_at: string;
  updated_at: string;
  path?: string;
  depth?: number;
  children?: RazunaFolder[];
  files?: RazunaFile[];
}

export interface RazunaWorkspace {
  _id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  is_paid?: boolean;
  upload_limit?: number; // Upload limit in bytes
}

export interface SearchResult {
  files: RazunaFile[];
  total: number;
  page: number;
  per_page: number;
}

// API Response types
export interface WorkspacesResponse {
  results?: RazunaWorkspace[];
  [key: string]: unknown;
}

export interface FolderTreeResponse {
  [key: string]: FolderTreeNode;
}

export interface FolderTreeNode {
  name?: string;
  depth?: number;
  subfolders?: Record<string, FolderTreeNode>;
  [key: string]: unknown;
}

export interface FilesResponse {
  results?:
    | {
        files?: RazunaFile[];
        total?: number;
        page?: number;
        per_page?: number;
      }
    | RazunaFile[];
  total?: number;
  page?: number;
  per_page?: number;
  files?: RazunaFile[];
  [key: string]: unknown;
}

export interface SearchApiResponse {
  results?:
    | {
        files?: RazunaFile[];
        total?: number;
        page?: number;
        per_page?: number;
      }
    | RazunaFile[];
  total?: number;
  page?: number;
  per_page?: number;
  [key: string]: unknown;
}

export interface UploadResponse {
  results?: RazunaFile[];
  file?: RazunaFile;
  [key: string]: unknown;
}

export const getPreferences = (): Preferences => {
  return getPreferenceValues<Preferences>();
};

export const getApiUrl = (path: string): string => {
  const { server_url } = getPreferences();
  const baseUrl = server_url.startsWith("http") ? server_url : `https://${server_url}`;
  return `${baseUrl.replace(/\/$/, "")}${path}`;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Workspace storage functions
const SELECTED_WORKSPACE_KEY = "selectedWorkspace";
const SELECTED_FOLDER_KEY = "selectedFolder";

export const getSelectedWorkspace = async (): Promise<RazunaWorkspace | null> => {
  try {
    const workspaceData = await LocalStorage.getItem<string>(SELECTED_WORKSPACE_KEY);
    return workspaceData ? JSON.parse(workspaceData) : null;
  } catch (error) {
    console.error("Error getting selected workspace:", error);
    return null;
  }
};

export const setSelectedWorkspace = async (workspace: RazunaWorkspace | null): Promise<void> => {
  try {
    if (workspace) {
      await LocalStorage.setItem(SELECTED_WORKSPACE_KEY, JSON.stringify(workspace));
    } else {
      await LocalStorage.removeItem(SELECTED_WORKSPACE_KEY);
    }
  } catch (error) {
    console.error("Error setting selected workspace:", error);
  }
};

export const getSelectedFolder = async (): Promise<string | null> => {
  try {
    const folderId = await LocalStorage.getItem<string>(SELECTED_FOLDER_KEY);
    return folderId || null;
  } catch (error) {
    console.error("Error getting selected folder:", error);
    return null;
  }
};

export const setSelectedFolder = async (folderId: string | null): Promise<void> => {
  try {
    if (folderId) {
      await LocalStorage.setItem(SELECTED_FOLDER_KEY, folderId);
    } else {
      await LocalStorage.removeItem(SELECTED_FOLDER_KEY);
    }
  } catch (error) {
    console.error("Error setting selected folder:", error);
  }
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};
