export type FileType = "directory" | "file" | "symlink" | "other";

export type FileDataType = {
  type: FileType;
  name: string;
  size: number;
  permissions: string;
  path: string;
};
