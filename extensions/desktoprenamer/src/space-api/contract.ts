// Shared SpaceAPI contract types and constants.

export const MINIMUM_DESKTOP_RENAMER_API_VERSION = "1.0.0";
export const STRUCTURED_DESKTOP_RENAMER_API_VERSION = MINIMUM_DESKTOP_RENAMER_API_VERSION;
export const DESKTOP_RENAMER_JSON_RPC_VERSION = "2.0";
export const SUPPORTED_DESKTOP_RENAMER_API_MAJOR = 1;
export const MAX_STRUCTURED_PAYLOAD_BYTES = 1_048_576;
export const READ_REQUEST_TIMEOUT_MS = 3_000;
export const OPERATION_REQUEST_TIMEOUT_MS = 10_000;
export const PREFERRED_DESKTOP_RENAMER_API_PREFIX = "dev.mqiu.DesktopRenamer";
export const LEGACY_DESKTOP_RENAMER_API_PREFIX = "com.michaelqiu.DesktopRenamer";

export type SpaceAPINamespace = "preferred" | "legacy";

export type SpaceAPIMethod =
  | "getAPIInfo"
  | "getAPIVersion"
  | "getSpaceSnapshot"
  | "getCurrentSpaceName"
  | "getCurrentSpaceID"
  | "getAllSpaces"
  | "switchToSpace"
  | "toggleLockSpace"
  | "restoreMovedWindows"
  | "renameCurrentSpace"
  | "renameSpace"
  | "rearrangeSpace"
  | "moveWindowNext"
  | "moveWindowPrevious"
  | "moveWindowToSpace"
  | "reloadSpaceLabels"
  | "toggleMenubar"
  | "toggleLauncher"
  | "toggleLabels"
  | "toggleActiveLabel"
  | "togglePreviewLabel"
  | "toggleDesktopVisibility"
  | "getWindows"
  | "focusWindow"
  | "executeWindowAction"
  | "moveSpecificWindow";

export type SpaceAPIParameters = Record<string, string | number | boolean>;

export type EmptySpaceAPIParameters = Record<string, never>;

export const SPACE_API_WINDOW_ACTIONS = [
  "close",
  "minimize",
  "hide",
  "enterFullScreen",
  "exitFullScreen",
  "quit",
  "restore",
] as const;

export type SpaceAPIWindowAction = (typeof SPACE_API_WINDOW_ACTIONS)[number];

const SPACE_API_WINDOW_ACTION_LABELS: Record<SpaceAPIWindowAction, string> = {
  close: "Close window",
  minimize: "Minimize window",
  hide: "Hide application",
  enterFullScreen: "Enter full screen",
  exitFullScreen: "Exit full screen",
  quit: "Quit application",
  restore: "Restore window",
};

export function getWindowActionLabel(action: SpaceAPIWindowAction): string {
  return SPACE_API_WINDOW_ACTION_LABELS[action];
}

export type SpaceAPIParameterKind = "string" | "positiveInteger" | "boolean" | "direction" | "windowAction";

export interface SpaceAPIMethodDefinition {
  parameters: Record<string, SpaceAPIParameterKind>;
  required: readonly string[];
}

export interface SpaceAPIMethodArguments {
  getAPIInfo: EmptySpaceAPIParameters;
  getAPIVersion: EmptySpaceAPIParameters;
  getSpaceSnapshot: EmptySpaceAPIParameters;
  getCurrentSpaceName: EmptySpaceAPIParameters;
  getCurrentSpaceID: EmptySpaceAPIParameters;
  getAllSpaces: EmptySpaceAPIParameters;
  switchToSpace: { spaceID: string };
  toggleLockSpace: { spaceID: string };
  restoreMovedWindows: EmptySpaceAPIParameters;
  renameCurrentSpace: { name: string };
  renameSpace: { spaceID: string; name: string };
  rearrangeSpace: { spaceID: string; direction: "up" | "down" };
  moveWindowNext: EmptySpaceAPIParameters;
  moveWindowPrevious: EmptySpaceAPIParameters;
  moveWindowToSpace: { spaceID: string };
  reloadSpaceLabels: EmptySpaceAPIParameters;
  toggleMenubar: EmptySpaceAPIParameters;
  toggleLauncher: EmptySpaceAPIParameters;
  toggleLabels: EmptySpaceAPIParameters;
  toggleActiveLabel: EmptySpaceAPIParameters;
  togglePreviewLabel: EmptySpaceAPIParameters;
  toggleDesktopVisibility: EmptySpaceAPIParameters;
  getWindows: EmptySpaceAPIParameters;
  focusWindow: { windowID: number; pid: number };
  executeWindowAction: { windowID: number; pid: number; action: SpaceAPIWindowAction };
  moveSpecificWindow: {
    windowID: number;
    pid?: number;
    fromSpaceID: string;
    targetSpaceID: string;
    isMinimized?: boolean;
    isHidden?: boolean;
  };
}

export const SPACE_API_ERROR_CODES = {
  parseError: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internalError: -32603,
  apiDisabled: -32001,
  appUnavailable: -32002,
  operationFailed: -32004,
  unsupportedContract: -32005,
  payloadTooLarge: -32006,
  responseMismatch: -32007,
} as const;

export const SPACE_API_METHOD_DEFINITIONS: Record<SpaceAPIMethod, SpaceAPIMethodDefinition> = {
  getAPIInfo: { parameters: {}, required: [] },
  getAPIVersion: { parameters: {}, required: [] },
  getSpaceSnapshot: { parameters: {}, required: [] },
  getCurrentSpaceName: { parameters: {}, required: [] },
  getCurrentSpaceID: { parameters: {}, required: [] },
  getAllSpaces: { parameters: {}, required: [] },
  switchToSpace: { parameters: { spaceID: "string" }, required: ["spaceID"] },
  toggleLockSpace: { parameters: { spaceID: "string" }, required: ["spaceID"] },
  restoreMovedWindows: { parameters: {}, required: [] },
  renameCurrentSpace: { parameters: { name: "string" }, required: ["name"] },
  renameSpace: {
    parameters: { spaceID: "string", name: "string" },
    required: ["spaceID", "name"],
  },
  rearrangeSpace: {
    parameters: { spaceID: "string", direction: "direction" },
    required: ["spaceID", "direction"],
  },
  moveWindowNext: { parameters: {}, required: [] },
  moveWindowPrevious: { parameters: {}, required: [] },
  moveWindowToSpace: { parameters: { spaceID: "string" }, required: ["spaceID"] },
  reloadSpaceLabels: { parameters: {}, required: [] },
  toggleMenubar: { parameters: {}, required: [] },
  toggleLauncher: { parameters: {}, required: [] },
  toggleLabels: { parameters: {}, required: [] },
  toggleActiveLabel: { parameters: {}, required: [] },
  togglePreviewLabel: { parameters: {}, required: [] },
  toggleDesktopVisibility: { parameters: {}, required: [] },
  getWindows: { parameters: {}, required: [] },
  focusWindow: {
    parameters: { windowID: "positiveInteger", pid: "positiveInteger" },
    required: ["windowID", "pid"],
  },
  executeWindowAction: {
    parameters: { windowID: "positiveInteger", pid: "positiveInteger", action: "windowAction" },
    required: ["windowID", "pid", "action"],
  },
  moveSpecificWindow: {
    parameters: {
      windowID: "positiveInteger",
      pid: "positiveInteger",
      fromSpaceID: "string",
      targetSpaceID: "string",
      isMinimized: "boolean",
      isHidden: "boolean",
    },
    required: ["windowID", "fromSpaceID", "targetSpaceID"],
  },
};

export const STRUCTURED_READ_METHODS = new Set<SpaceAPIMethod>([
  "getAPIInfo",
  "getAPIVersion",
  "getSpaceSnapshot",
  "getCurrentSpaceName",
  "getCurrentSpaceID",
  "getAllSpaces",
  "getWindows",
]);

export const SPACE_API_RPC_REQUEST_NOTIFICATION = `${PREFERRED_DESKTOP_RENAMER_API_PREFIX}.RPCRequest`;
export const SPACE_API_RPC_RESPONSE_NOTIFICATION = `${PREFERRED_DESKTOP_RENAMER_API_PREFIX}.RPCResponse`;
export const SPACE_API_RPC_EVENT_NOTIFICATION = `${PREFERRED_DESKTOP_RENAMER_API_PREFIX}.RPCEvent`;
export const LEGACY_SPACE_API_RPC_REQUEST_NOTIFICATION = `${LEGACY_DESKTOP_RENAMER_API_PREFIX}.RPCRequest`;
export const LEGACY_SPACE_API_RPC_RESPONSE_NOTIFICATION = `${LEGACY_DESKTOP_RENAMER_API_PREFIX}.RPCResponse`;
export const LEGACY_SPACE_API_RPC_EVENT_NOTIFICATION = `${LEGACY_DESKTOP_RENAMER_API_PREFIX}.RPCEvent`;
export const SPACE_API_PAYLOAD_KEY = "payload";

export interface SpaceAPISpaceRecord {
  id: string;
  name: string;
  displayID: string;
  displayName: string;
  number: number;
  isFullscreen: boolean;
  appName: string | null;
  appPath: string | null;
  globalShortcutNumber: number | null;
  isLocked: boolean;
}

export interface SpaceAPISnapshot {
  apiVersion: string;
  revision: number;
  timestamp: string;
  currentSpaceIDs: string[];
  currentSpaceID?: string;
  currentDisplayID?: string;
  currentSpaceName: string;
  movedWindowsCount: number;
  spaces: SpaceAPISpaceRecord[];
}

export interface SpaceAPIWindowRecord {
  id: number;
  pid: number;
  ownerName: string;
  appPath: string | null;
  title: string | null;
  spaceID: string;
  isMinimized: boolean;
  isHidden: boolean;
}

export interface SpaceAPIWindowsSnapshot {
  apiVersion: string;
  revision: number;
  timestamp: string;
  spaces: SpaceAPISpaceRecord[];
  windows: SpaceAPIWindowRecord[];
}

export interface SpaceAPIWindowSpaceRecord {
  id: string;
  name: string;
  displayID: string;
  displayName: string;
  num: number;
  isFullscreen: boolean;
}

export interface SpaceAPIWindowEntry {
  windowID: number;
  pid: number;
  ownerName: string;
  appPath: string;
  title: string;
  space: SpaceAPIWindowSpaceRecord;
  isMinimized: boolean;
  isHidden: boolean;
}

export interface SpaceAPIInfo {
  contractVersion: string;
  jsonRPCVersion: string;
  supportedMethods: string[];
  legacyNotifications: boolean;
  legacyCompatibility: string;
  eventNotifications: boolean;
  eventCapabilities: string[];
  maxPayloadBytes: number;
}

export interface SpaceAPIOperationResult {
  accepted: boolean;
}

export interface SpaceAPIMethodResults {
  getAPIInfo: SpaceAPIInfo;
  getAPIVersion: string;
  getSpaceSnapshot: SpaceAPISnapshot;
  getCurrentSpaceName: string;
  getCurrentSpaceID: string[];
  getAllSpaces: SpaceAPISpaceRecord[];
  switchToSpace: SpaceAPIOperationResult;
  toggleLockSpace: SpaceAPIOperationResult;
  restoreMovedWindows: SpaceAPIOperationResult;
  renameCurrentSpace: SpaceAPIOperationResult;
  renameSpace: SpaceAPIOperationResult;
  rearrangeSpace: SpaceAPIOperationResult;
  moveWindowNext: SpaceAPIOperationResult;
  moveWindowPrevious: SpaceAPIOperationResult;
  moveWindowToSpace: SpaceAPIOperationResult;
  reloadSpaceLabels: SpaceAPIOperationResult;
  toggleMenubar: boolean;
  toggleLauncher: boolean;
  toggleLabels: boolean;
  toggleActiveLabel: boolean;
  togglePreviewLabel: boolean;
  toggleDesktopVisibility: boolean;
  getWindows: SpaceAPIWindowsSnapshot;
  focusWindow: SpaceAPIOperationResult;
  executeWindowAction: SpaceAPIOperationResult;
  moveSpecificWindow: SpaceAPIOperationResult;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JSONRPCResponse {
  jsonrpc: string;
  id: string | null;
  result?: unknown;
  error?: JSONRPCError;
}

export interface JSONRPCEvent {
  jsonrpc: string;
  method: string;
  params: Record<string, unknown>;
}

export interface SpaceAPIStateChangedEvent {
  jsonrpc: string;
  method: "stateChanged";
  reason: string;
  snapshot: SpaceAPISnapshot;
}

export class SpaceAPIProtocolError extends Error {
  readonly code: number;
  readonly data?: unknown;
  readonly canFallback: boolean;

  constructor(
    message: string,
    code: number = SPACE_API_ERROR_CODES.invalidRequest,
    data?: unknown,
    canFallback = false,
  ) {
    super(message);
    this.name = "SpaceAPIProtocolError";
    this.code = code;
    this.data = data;
    this.canFallback = canFallback;
  }
}
