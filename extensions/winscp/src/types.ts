export type WinSCPProtocol = "scp" | "sftp" | "ftp" | "webdav" | "s3";

/** A session exactly as WinSCP stores it, before it is turned into a `WinSCPSession`. */
export interface RawWinSCPSession {
  /** The stored key, e.g. `My%20Site`, `Prod/web` for a session in a folder, or `Workspace/0000`. */
  id: string;
  hostName?: string;
  userName?: string;
  fsProtocol?: string;
  /** Set by WinSCP on each member of a workspace. This is the only thing that tells a workspace apart from a folder. */
  isWorkspace?: boolean;
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
