export type FileInfo = {
  name: string;
  path: string;
  displayPath: string;
  fileSizeFormatted: string;
  createdAt: Date;
  updatedAt: Date;
  favorite: boolean;
  searchScore?: number;
};

export type Preferences = {
  shouldShowHiddenFiles: boolean;
  shouldShowDirectories: boolean;
  excludePaths: string;
  googleDriveRootPath: string;
};
