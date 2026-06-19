/**
 * SSH host configuration parsed from ~/.ssh/config
 */
export interface SSHHostConfig {
  host: string; // Host alias from config
  hostName?: string; // Actual hostname or IP
  user?: string; // SSH username
  port?: number; // SSH port (default 22)
  identityFile?: string; // Path to SSH key
  proxyJump?: string; // Jump host configuration
}

/**
 * Direction of file transfer
 */
export enum TransferDirection {
  UPLOAD = "upload",
  DOWNLOAD = "download",
}

/**
 * Rsync-specific options
 */
export interface RsyncOptions {
  humanReadable?: boolean; // -h: human-readable file sizes
  delete?: boolean; // --delete: delete extraneous files from destination
  progress?: boolean; // -P: show progress and support partial transfers
}

/**
 * Options for rsync transfer operation
 */
export interface TransferOptions {
  hostConfig: SSHHostConfig;
  localPath: string;
  remotePath: string;
  direction: TransferDirection;
  rsyncOptions?: RsyncOptions;
}

/**
 * Result of rsync command execution
 */
export interface RsyncResult {
  success: boolean;
  message: string;
  stdout?: string; // rsync output messages
  stderr?: string;
}

/**
 * Remote file information from ls command
 */
export interface RemoteFile {
  name: string;
  isDirectory: boolean;
  size?: string;
  permissions?: string;
  modifiedDate?: string;
}
