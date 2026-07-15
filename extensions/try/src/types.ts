export interface TryDirectory {
  name: string;
  path: string;
  mtime: Date;
  ctime: Date;
  datePrefix?: string;
  displayName?: string;
}
