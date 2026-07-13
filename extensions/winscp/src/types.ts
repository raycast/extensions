export type WinSCPProtocol = "scp" | "sftp" | "ftp" | "webdav" | "s3";

/** A session exactly as WinSCP stores it, before it is turned into a `WinSCPSession`. */
export interface RawWinSCPSession {
  /** The stored key, e.g. `My%20Site` or `Workspace/0000`. */
  id: string;
  hostName?: string;
  userName?: string;
  fsProtocol?: string;
}

export interface WinSCPSession {
  /** The stored, still URL-encoded key. This is what WinSCP.exe expects as its argument. */
  id: string;
  /** The decoded `id`, for display only. */
  name: string;
  protocol: WinSCPProtocol;
  host?: string;
  user?: string;
  isWorkspace: boolean;
  /** Number of sessions a workspace opens at once. Only set for workspaces. */
  sessionCount?: number;
}
