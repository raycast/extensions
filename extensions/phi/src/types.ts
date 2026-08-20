import { isAbsolute } from "node:path";

export const PHI_SCHEMA_VERSION = 1;
export const PHI_API_VERSION = 1;

export type ApplicationChannel = "stable" | "canary";

export type PhiErrorKind =
  | "permissionDenied"
  | "unavailable"
  | "minimumVersionNotMet"
  | "unsupportedVersion"
  | "timeout"
  | "staleResult"
  | "noWindows"
  | "invalidArgument"
  | "operationFailed"
  | "malformedResponse"
  | "unknown";

export class PhiError extends Error {
  constructor(
    public readonly kind: PhiErrorKind,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "PhiError";
  }
}

export interface PhiSpace {
  id: string;
  title: string;
  profileId: string;
  profileName: string;
  colorHex: string;
  iconData: string | null;
  isActive: boolean;
  isOpen: boolean;
}

export interface PhiTab {
  id: string;
  windowId: string;
  spaceId: string;
  title: string;
  url: string | null;
  isActive: boolean;
  isPinned: boolean;
}

export type PhiPinnedTabScope = "space" | "profile" | "app";

export interface PhiSavedItemPane {
  id: string;
  title: string;
  url: string | null;
}

export interface PhiPinnedTab {
  id: string;
  scope: PhiPinnedTabScope;
  ownerSpaceId: string | null;
  spaceIds: string[];
  title: string;
  url: string | null;
  secondary: PhiSavedItemPane | null;
}

export interface PhiBookmark {
  id: string;
  spaceId: string;
  title: string;
  url: string | null;
  secondary: PhiSavedItemPane | null;
}

export interface PhiTabSearchResults {
  tabs: PhiTab[];
  pinnedTabs: PhiPinnedTab[];
  bookmarks: PhiBookmark[];
  targetSpaceId: string | null;
}

export interface PhiVersion {
  apiVersion: number;
  version: string;
  build: string;
}

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;
}

function requiredString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function requiredBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function nullableString(value: unknown): string | null | undefined {
  return value === null || typeof value === "string" ? value : undefined;
}

function optionalSpaceIconData(value: unknown): string | null | undefined {
  if (value === undefined || value === null) {
    return null;
  }
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 64 * 1_024 ||
    value.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(value)
  ) {
    return undefined;
  }

  const data = Buffer.from(value, "base64");
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const hasPNGSignature = pngSignature.every(
    (byte, index) => data[index] === byte,
  );
  if (
    data.length < 24 ||
    !hasPNGSignature ||
    data.readUInt32BE(16) !== 40 ||
    data.readUInt32BE(20) !== 40
  ) {
    return undefined;
  }
  return value;
}

function parseSavedItemPane(value: unknown): PhiSavedItemPane | undefined {
  const pane = record(value);
  if (!pane) {
    return undefined;
  }
  const parsed = {
    id: requiredString(pane.id),
    title: requiredString(pane.title),
    url: nullableString(pane.url),
  };
  return typeof parsed.id === "string" &&
    typeof parsed.title === "string" &&
    (parsed.url === null || typeof parsed.url === "string")
    ? (parsed as PhiSavedItemPane)
    : undefined;
}

function parseRoot(raw: string): UnknownRecord {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    throw new PhiError(
      "malformedResponse",
      "Phi returned malformed JSON.",
      error,
    );
  }

  const root = record(value);
  if (!root) {
    throw new PhiError(
      "malformedResponse",
      "Phi returned an invalid response object.",
    );
  }
  if (root.schemaVersion !== PHI_SCHEMA_VERSION) {
    throw new PhiError(
      "unsupportedVersion",
      "This extension does not support Phi's scripting response version.",
    );
  }
  if (typeof root.ok !== "boolean") {
    throw new PhiError(
      "malformedResponse",
      "Phi's response is missing its status.",
    );
  }
  if (!root.ok) {
    throwNativeError(root.error);
  }
  return root;
}

function throwNativeError(value: unknown): never {
  const error = record(value);
  const code = requiredString(error?.code);
  switch (code) {
    case "no_windows":
    case "no_active_window":
      throw new PhiError(
        "noWindows",
        "Open a normal Phi window and try again.",
      );
    case "space_not_found":
    case "tab_not_found":
      throw new PhiError(
        "staleResult",
        "This result is no longer available. Refresh and try again.",
      );
    case "invalid_argument":
      throw new PhiError(
        "invalidArgument",
        "Phi rejected an invalid command argument.",
      );
    case "operation_failed":
      throw new PhiError(
        "operationFailed",
        "Phi could not complete the requested operation.",
      );
    default:
      throw new PhiError("unknown", "Phi returned an unknown scripting error.");
  }
}

export function parseSpacesResponse(raw: string): PhiSpace[] {
  const root = parseRoot(raw);
  if (!Array.isArray(root.spaces)) {
    throw new PhiError(
      "malformedResponse",
      "Phi's response is missing its Spaces.",
    );
  }
  return root.spaces.map((value) => {
    const space = record(value);
    const parsed: PhiSpace | undefined = space
      ? {
          id: requiredString(space.id) as string,
          title: requiredString(space.title) as string,
          profileId: requiredString(space.profileId) as string,
          profileName: requiredString(space.profileName) as string,
          colorHex: requiredString(space.colorHex) as string,
          iconData: optionalSpaceIconData(space.iconData) as string | null,
          isActive: requiredBoolean(space.isActive) as boolean,
          isOpen: requiredBoolean(space.isOpen) as boolean,
        }
      : undefined;
    if (
      !parsed ||
      typeof parsed.id !== "string" ||
      typeof parsed.title !== "string" ||
      typeof parsed.profileId !== "string" ||
      typeof parsed.profileName !== "string" ||
      typeof parsed.colorHex !== "string" ||
      (parsed.iconData !== null && typeof parsed.iconData !== "string") ||
      typeof parsed.isActive !== "boolean" ||
      typeof parsed.isOpen !== "boolean"
    ) {
      throw new PhiError(
        "malformedResponse",
        "Phi returned an invalid Space record.",
      );
    }
    return parsed;
  });
}

export function parseTabsResponse(raw: string): PhiTabSearchResults {
  const root = parseRoot(raw);
  if (
    !Array.isArray(root.tabs) ||
    !Array.isArray(root.pinnedTabs) ||
    !Array.isArray(root.bookmarks) ||
    nullableString(root.targetSpaceId) === undefined
  ) {
    throw new PhiError(
      "malformedResponse",
      "Phi's response is missing its Search Tabs data.",
    );
  }
  const tabs = root.tabs.map((value) => {
    const tab = record(value);
    const url = nullableString(tab?.url);
    if (url === undefined) {
      throw new PhiError(
        "malformedResponse",
        "Phi returned an invalid tab URL.",
      );
    }
    const parsed: PhiTab | undefined = tab
      ? {
          id: requiredString(tab.id) as string,
          windowId: requiredString(tab.windowId) as string,
          spaceId: requiredString(tab.spaceId) as string,
          title: requiredString(tab.title) as string,
          url,
          isActive: requiredBoolean(tab.isActive) as boolean,
          isPinned: requiredBoolean(tab.isPinned) as boolean,
        }
      : undefined;
    if (
      !parsed ||
      typeof parsed.id !== "string" ||
      typeof parsed.windowId !== "string" ||
      typeof parsed.spaceId !== "string" ||
      typeof parsed.title !== "string" ||
      typeof parsed.isActive !== "boolean" ||
      typeof parsed.isPinned !== "boolean"
    ) {
      throw new PhiError(
        "malformedResponse",
        "Phi returned an invalid tab record.",
      );
    }
    return parsed;
  });
  const pinnedTabs = root.pinnedTabs.map((value) => {
    const pin = record(value);
    const ownerSpaceId = nullableString(pin?.ownerSpaceId);
    const url = nullableString(pin?.url);
    const secondary =
      pin?.secondary === null ? null : parseSavedItemPane(pin?.secondary);
    const spaceIds = pin?.spaceIds;
    const scope = pin?.scope;
    const parsed: PhiPinnedTab | undefined =
      pin &&
      ownerSpaceId !== undefined &&
      url !== undefined &&
      secondary !== undefined &&
      Array.isArray(spaceIds) &&
      spaceIds.length > 0 &&
      spaceIds.every((spaceId) => typeof spaceId === "string") &&
      (scope === "space" || scope === "profile" || scope === "app")
        ? {
            id: requiredString(pin.id) as string,
            scope,
            ownerSpaceId,
            spaceIds,
            title: requiredString(pin.title) as string,
            url,
            secondary,
          }
        : undefined;
    if (
      !parsed ||
      typeof parsed.id !== "string" ||
      typeof parsed.title !== "string"
    ) {
      throw new PhiError(
        "malformedResponse",
        "Phi returned an invalid pinned-tab record.",
      );
    }
    return parsed;
  });
  const bookmarks = root.bookmarks.map((value) => {
    const bookmark = record(value);
    const url = nullableString(bookmark?.url);
    const secondary =
      bookmark?.secondary === null
        ? null
        : parseSavedItemPane(bookmark?.secondary);
    const parsed: PhiBookmark | undefined =
      bookmark && url !== undefined && secondary !== undefined
        ? {
            id: requiredString(bookmark.id) as string,
            spaceId: requiredString(bookmark.spaceId) as string,
            title: requiredString(bookmark.title) as string,
            url,
            secondary,
          }
        : undefined;
    if (
      !parsed ||
      typeof parsed.id !== "string" ||
      typeof parsed.spaceId !== "string" ||
      typeof parsed.title !== "string"
    ) {
      throw new PhiError(
        "malformedResponse",
        "Phi returned an invalid bookmark record.",
      );
    }
    return parsed;
  });
  return {
    tabs,
    pinnedTabs,
    bookmarks,
    targetSpaceId: nullableString(root.targetSpaceId) as string | null,
  };
}

export function parseVersionResponse(raw: string): PhiVersion {
  const root = parseRoot(raw);
  if (
    typeof root.apiVersion !== "number" ||
    !Number.isInteger(root.apiVersion) ||
    typeof root.version !== "string" ||
    typeof root.build !== "string"
  ) {
    throw new PhiError(
      "malformedResponse",
      "Phi returned an invalid version response.",
    );
  }
  return {
    apiVersion: root.apiVersion,
    version: root.version,
    build: root.build,
  };
}

export function parseChromiumDataDirectoryResponse(raw: string): string {
  const root = parseRoot(raw);
  const directory = requiredString(root.chromiumDataDirectory);
  if (!directory || !isAbsolute(directory)) {
    throw new PhiError(
      "malformedResponse",
      "Phi returned an invalid Chromium data directory.",
    );
  }
  return directory;
}

export function parseAcknowledgement(raw: string): void {
  parseRoot(raw);
}
