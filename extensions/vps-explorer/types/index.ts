export interface FileItem {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  permissions: string;
  modifiedTime: Date | string;
  owner: string;
  group: string;
}

export interface VPSConnectionData {
  host: string;
  port: number | 22;
  username: string | "root";
  password?: string;
}

export interface VPSConnectionConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKeyPath?: string;
  defaultPath: string;
}

export interface VPSConnection {
  connect(config: VPSConnectionData): Promise<void>;
  disconnect(): Promise<void>;
  listFiles(path: string, fileGlob?: string): Promise<FileItem[]>;
  createDirectory(remotePath: string, directoryName: string): Promise<void>;
  deleteFile(remotePath: string): Promise<void>;
  renameFile(remotePath: string, newName: string): Promise<void>;
  downloadFile(remotePath: string, localPath: string): Promise<void>;
  uploadFile(localPath: string, remotePath: string): Promise<void>;
  isConnected(): boolean;
}

export enum SortTypes {
  NAME = "name",
  MODIFIED_TIME = "modifiedTime",
  SIZE = "size",
  KIND = "kind",
}

export enum SortOrders {
  ASC = "asc",
  DESC = "desc",
}
