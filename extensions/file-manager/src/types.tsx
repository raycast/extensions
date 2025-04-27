export type FileType = "directory" | "file" | "symlink" | "other";

export type FileDataType = {
  type: FileType;
  name: string;
  size: number;
  permissions: string;
  path: string;
};

export type Preferences = {
  startDirectory: string;
  caseSensitive: boolean;
  directoriesFirst: boolean;
  showDots: boolean;
  showHiddenFiles: boolean;
  showFilePermissions: boolean;
  showFileSize: boolean;
  showDeleteActions: boolean;
  standardShortcuts: boolean;
  showiCloudDrive: boolean;
  respectGitignore: boolean;
  respectRayignore: boolean;
  searchByPermissions: boolean;
};
