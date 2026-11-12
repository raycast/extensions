import { ScanOptions } from "../types";

export const SETTINGS_KEY = "scan-options-v1";

export function decodeScanSettings(raw: string | undefined): ScanOptions | undefined {
  return parseScanSettings(raw ? JSON.parse(raw) : undefined);
}

export function parseScanSettings(value: unknown): ScanOptions | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object")
    throw new Error("Saved scan settings are invalid. Run Configure Scan again.");
  const options = value as Record<string, unknown>;
  if (
    !["root", "profiles", "executable", "config", "exclusions"].every((key) => typeof options[key] === "string") ||
    typeof options.includeSensitive !== "boolean"
  ) {
    throw new Error("Saved scan settings are invalid. Run Configure Scan again.");
  }
  return {
    root: options.root as string,
    profiles: options.profiles as string,
    executable: options.executable as string,
    config: options.config as string,
    exclusions: options.exclusions as string,
    includeSensitive: options.includeSensitive,
  };
}
