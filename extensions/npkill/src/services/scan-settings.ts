import { ScanOptions } from "../types";

export const SETTINGS_KEY = "scan-options-v1";

export function parseScanSettings(raw: string | undefined): ScanOptions | undefined {
  if (!raw) return undefined;
  const value: unknown = JSON.parse(raw);
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
