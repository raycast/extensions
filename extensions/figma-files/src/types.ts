export type File = {
  key: string;
  last_modified: string;
  name: string;
  thumbnail_url: string;
  branches: Branch[];
};

export type Branch = {
  key: string;
  last_modified: string;
  name: string;
  thumbnail_url: string;
};

export type Project = {
  id: string;
  name: string;
};

// A folder (previously called a "project") as returned by the v2 folders endpoints
export type Folder = {
  id: string;
  name: string;
  parent_folder_id: string | null;
};

export type FolderFiles = {
  id: string;
  name: string;
  // Full path from the top-level folder, e.g. "Design / Mobile / Onboarding"
  path: string;
  parentId: string | null;
  files: File[];
};

// "v2" walks nested folders, "v1" is the legacy projects API that only sees top-level folders
export type FolderSource = "v1" | "v2";

export type TeamFiles = {
  id: string;
  name: string;
  source: FolderSource;
  folders: FolderFiles[];
};

export type TeamProjects = {
  name: string;
  projects: Project[];
};

export type TeamFolders = {
  name: string;
  folders: Folder[];
};

export type FolderFilesResponse = {
  name: string;
  files?: File[];
};

export type FileDetail = {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  document: Node;
};

export interface Node {
  id: string;
  name: string;
  children: Node[];
}
