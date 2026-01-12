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
 * Options for SCP transfer operation
 */
export interface TransferOptions {
  hostConfig: SSHHostConfig;
  localPath: string;
  remotePath: string;
  direction: TransferDirection;
}

/**
 * Result of SCP command execution
 */
export interface ScpResult {
  success: boolean;
  message: string;
  stderr?: string;
}
