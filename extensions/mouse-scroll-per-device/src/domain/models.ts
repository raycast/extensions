export type PermissionState = "notDetermined" | "denied" | "granted" | "unavailable";

export type OperationResult<T> =
  | { status: "succeeded"; value: T; receipt?: { detail: string } }
  | { status: "cancelled" }
  | { status: "unavailable"; reason: string; recovery?: string }
  | { status: "permission_required"; permission: string; recovery: string }
  | { status: "failed"; error: string };

export interface MouseDevice {
  key: string;
  profileKey?: string;
  identityState: "stable" | "ambiguous";
  name: string;
  vendorID: number;
  productID: number;
  serialNumber?: string;
  locationID?: number;
}

export interface ScrollProfile {
  name: string;
  reverseVertical: boolean;
  reverseHorizontal: boolean;
  verticalMultiplier: number;
  horizontalMultiplier: number;
}

export interface ProfileDocument {
  version: 1;
  profiles: Record<string, ScrollProfile>;
}

export interface PermissionStatus {
  inputMonitoring: PermissionState;
  accessibility: PermissionState;
}

export type HelperRuntimeState =
  | "packagedIdentityInvalid"
  | "installedIdentityInvalid"
  | "notInstalled"
  | "stopped"
  | "running"
  | "stale"
  | "identityMismatch";

export interface HelperIdentityStatus {
  packaged: "valid" | "invalid";
  installed: "notInstalled" | "valid" | "invalid" | "pathMismatch";
  detail: string;
}

export interface HelperStatus {
  state: HelperRuntimeState;
  pid?: number;
  executablePath?: string;
  detail?: string;
  counters?: HelperCounters;
  permissions: PermissionStatus;
  identity?: HelperIdentityStatus;
}

export interface HelperCounters {
  observedHID: number;
  matchedQuartz: number;
  transformedEvents: number;
  unmatchedQuartz: number;
  ambiguousDevices: number;
}

export function defaultProfile(device: MouseDevice): ScrollProfile {
  return {
    name: device.name,
    reverseVertical: false,
    reverseHorizontal: false,
    verticalMultiplier: 1,
    horizontalMultiplier: 1,
  };
}

export function validateMultiplier(value: number): string | undefined {
  if (!Number.isFinite(value)) return "Multiplier must be a number.";
  if (value < 0.1 || value > 10) return "Multiplier must be between 0.1 and 10.";
  return undefined;
}

export function validateProfile(profile: ScrollProfile): string | undefined {
  if (!profile.name.trim()) return "Profile name is required.";
  return validateMultiplier(profile.verticalMultiplier) ?? validateMultiplier(profile.horizontalMultiplier);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateProfileDocument(document: unknown): string | undefined {
  if (!isRecord(document) || document.version !== 1 || !isRecord(document.profiles)) {
    return "Unsupported profile document.";
  }
  for (const [key, candidate] of Object.entries(document.profiles)) {
    if (!key || !isRecord(candidate)) return "Invalid profile document.";
    if (typeof candidate.name !== "string") return `Profile ${key} has no name.`;
    if (typeof candidate.reverseVertical !== "boolean" || typeof candidate.reverseHorizontal !== "boolean") {
      return `Profile ${key} has invalid direction values.`;
    }
    if (typeof candidate.verticalMultiplier !== "number" || typeof candidate.horizontalMultiplier !== "number") {
      return `Profile ${key} has invalid multiplier values.`;
    }
    const invalid = validateProfile(candidate as unknown as ScrollProfile);
    if (invalid) return `Profile ${key}: ${invalid}`;
  }
  return undefined;
}
