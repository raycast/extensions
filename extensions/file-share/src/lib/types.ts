/** Marker the service echoes back so a probe can tell our service from a stranger on the same port. */
export const EXTENSION_ID = "file-share";

export const CONFIG_VERSION = 2;
export const LIST_VERSION = 1;

/**
 * Fixed port for the control plane. It only ever binds to 127.0.0.1 and exists so that the service can be
 * found again after the data port, the interface or the extension itself changed.
 */
export const CONTROL_PORT = 7330;

export const DEFAULT_PORT = 7331;

export const PORT_RANGE = { min: 1024, max: 49151 };

export const MAX_TEXT_LENGTH = 10000;

export type ServiceConfig = {
  version: number;
  extension: string;
  controlPort: number;
  port: number;
  /** IPv4 address of the interface the data plane listens on. */
  host: string;
  receiveDirectory: string;
  /** Where the service finds its static web assets. */
  assetsPath: string;
  /** Raycast host process: when it disappears, the service stops with it. */
  hostPid: number;
  updatedAt: string;
};

export type ShareEntryType = "file" | "directory" | "text";

export type ShareEntry = {
  id: string;
  type: ShareEntryType;
  name: string;
  /** Absolute path for file and directory entries. */
  path?: string;
  /** Body of a text entry. */
  content?: string;
  /** "host" or the IP of the visitor that added it. */
  source: string;
  addedAt: string;
  size?: number;
  mtimeMs?: number;
  /** Set when the underlying path no longer exists. */
  missing?: boolean;
};

export type ServiceStatus = {
  extension: string;
  configVersion: number;
  pid: number;
  startedAt: string;
  address: string;
  host: string;
  port: number;
  receiveDirectory: string;
  entryCount: number;
  textCount: number;
  fileCount: number;
  directoryCount: number;
};

export type PortOwner = {
  pid: number;
  command: string;
  user: string;
};

export type ProbeResult =
  | { state: "running"; status: ServiceStatus }
  | { state: "stopped" }
  | { state: "conflict"; port: number; owner?: PortOwner }
  | { state: "unknown"; message: string };

export type ActionResult =
  { ok: true; message: string } | { ok: false; message: string };
