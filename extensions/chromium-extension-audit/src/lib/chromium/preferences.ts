import { Dict, object, strings, unique } from "../json";
import { Extension, PermissionSet } from "../model";
import { normalizePatterns } from "../permissions/patterns";

export const EXTENSION_ID = /^[a-p]{32}$/;
export const PROFILE_ID = /^(Default|Profile \d+)$/;
export const SUPPORTED_MAJOR = { min: 100, max: 158 };
const major = (version: string) => (/^\d+\./.test(version) ? Number(version.split(".")[0]) : NaN);
// Newer engines are interpreted with the latest known schema; validatedVersion() drives the warning.
export function knownVersion(version: string): boolean {
  return major(version) >= SUPPORTED_MAJOR.min;
}
export function validatedVersion(version: string): boolean {
  return knownVersion(version) && major(version) <= SUPPORTED_MAJOR.max;
}
export function permissionSet(value: unknown): PermissionSet | null {
  const data = object(value);
  if (!data || !["api", "explicit_host", "scriptable_host"].some((key) => key in data)) return null;
  if (
    ["api", "explicit_host", "scriptable_host"].some(
      (key) =>
        data[key] !== undefined &&
        (!Array.isArray(data[key]) || (data[key] as unknown[]).some((v) => typeof v !== "string")),
    )
  )
    return null;
  return {
    api: unique(strings(data.api)),
    hosts: normalizePatterns(strings(data.explicit_host)),
    scripts: normalizePatterns(strings(data.scriptable_host), true),
  };
}
export function provenance(entry: Dict, version: string): Extension["provenance"] {
  if (!knownVersion(version)) return "Unknown";
  switch (entry.location) {
    case 4:
    case 8:
      return "Developer / unpacked";
    case 5:
    case 10:
      return "Browser component";
    case 7:
    case 9:
      return "Policy-managed";
    case 2:
    case 3:
    case 6:
      return "External / sideloaded";
    case 1:
      return entry.from_webstore === true ? "Web Store" : "Unknown";
    default:
      return "Unknown";
  }
}
export function extensionState(
  entry: Dict,
  version: string,
): Pick<Extension, "enabled" | "disableReasons" | "blocklisted" | "securityFlags"> {
  const raw = entry.disable_reasons;
  const validReasons =
    (Array.isArray(raw) && raw.every((n) => Number.isSafeInteger(n) && Number(n) >= 0)) ||
    (Number.isSafeInteger(raw) && Number(raw) >= 0);
  const disableReasons =
    Array.isArray(raw) && validReasons
      ? (raw as number[]).filter(Boolean)
      : typeof raw === "number" && validReasons
        ? Array.from({ length: 31 }, (_, i) => 2 ** i).filter((bit) => (raw & bit) !== 0)
        : [];
  const securityFlags = knownVersion(version) ? flags(entry, disableReasons) : [];
  const blocklisted =
    knownVersion(version) && (securityFlags.includes(MALWARE) || disableReasons.includes(DISABLE_GREYLIST));
  let enabled: Extension["enabled"] = "Unknown";
  if (knownVersion(version)) {
    if (blocklisted || disableReasons.length || entry.state === 0 || entry.state === 2) enabled = "Disabled";
    else if ((entry.state === 1 && (raw === undefined || validReasons)) || (entry.state === undefined && validReasons))
      enabled = "Enabled";
  }
  return { enabled, disableReasons, blocklisted, securityFlags };
}
export const MALWARE = "Malware blocklist";
export const VERIFICATION_FLAGS = ["Extension files failed verification", "Installation could not be verified"];
const DISABLE_NOT_VERIFIED = 256,
  DISABLE_GREYLIST = 512,
  DISABLE_CORRUPTED = 1024;
// blacklist_state and extension_telemetry_service_blocklist_state hold the BlocklistState enum;
// omaha_blocklist_state holds the BitMapBlocklistState bitmask (extensions/browser/blocklist_state.h).
const blocklistStates: [label: string, value: number, bit: number][] = [
  [MALWARE, 1, 1],
  ["Security vulnerability", 2, 2],
  ["Web Store policy violation", 3, 4],
  ["Potentially unwanted", 4, 8],
];
function flags(entry: Dict, disableReasons: number[]): string[] {
  const omaha = Number.isSafeInteger(entry.omaha_blocklist_state) ? (entry.omaha_blocklist_state as number) : 0;
  return [
    ...blocklistStates
      .filter(
        ([, value, bit]) =>
          entry.blacklist_state === value ||
          entry.extension_telemetry_service_blocklist_state === value ||
          (omaha & bit) !== 0,
      )
      .map(([label]) => label),
    ...(disableReasons.includes(DISABLE_CORRUPTED) ? [VERIFICATION_FLAGS[0]] : []),
    ...(disableReasons.includes(DISABLE_NOT_VERIFIED) ? [VERIFICATION_FLAGS[1]] : []),
  ];
}
export function chromeTime(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return;
  const millis = Number(BigInt(value) / 1000n - 11644473600000n);
  return millis > 0 && millis < 8640000000000000 ? new Date(millis).toISOString() : undefined;
}

// Retain only fields needed by the audit; never persist whole browser preferences.
const fields = [
  "manifest",
  "path",
  "location",
  "state",
  "disable_reasons",
  "from_webstore",
  "active_permissions",
  "granted_permissions",
  "runtime_granted_permissions",
  "withholding_permissions",
  "newAllowFileAccess",
  "blacklist_state",
  "omaha_blocklist_state",
  "extension_telemetry_service_blocklist_state",
  "first_install_time",
  "last_update_time",
];
export function settingsFrom(value: unknown): Record<string, Dict> | undefined {
  const extensions = object(object(value)?.extensions);
  const settings = object(extensions?.settings);
  if (!settings) return;
  const result: Record<string, Dict> = {};
  for (const [id, raw] of Object.entries(settings)) {
    if (!EXTENSION_ID.test(id)) continue;
    const entry = object(raw);
    if (!entry) throw new Error(`Invalid extension settings for ${id}`);
    result[id] = Object.fromEntries(fields.filter((key) => entry[key] !== undefined).map((key) => [key, entry[key]]));
  }
  return result;
}
