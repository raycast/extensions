export interface FileItem {
  path: string;
  name: string;
  mtime: number; // ms since epoch, used for sorting
}
