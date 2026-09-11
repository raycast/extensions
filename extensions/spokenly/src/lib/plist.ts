import { execFileSync } from "child_process";
import { BUNDLE_ID, PLIST_PATH } from "./constants";

const PLUTIL = "/usr/bin/plutil";
const DEFAULTS = "/usr/bin/defaults";

/**
 * Spokenly stores most settings as `Data` blobs whose payload is a JSON-encoded
 * value (`@AppStorage` + `Codable`). We read them by extracting the raw base64
 * via `plutil -extract <key> raw` and JSON-parsing the decoded bytes, and we
 * write them by base64-encoding the JSON and using `plutil -replace -data`.
 * `defaults write -string` would create a `<string>` element which Spokenly's
 * `JSONDecoder` would reject.
 */

function runPlutil(args: string[]): string {
  return execFileSync(PLUTIL, args, { encoding: "utf-8" });
}

export function readJSONPref<T>(
  key: string,
  plistPath: string = PLIST_PATH,
): T {
  const base64 = runPlutil([
    "-extract",
    key,
    "raw",
    "-o",
    "-",
    plistPath,
  ]).trim();
  const json = Buffer.from(base64, "base64").toString("utf-8");
  return JSON.parse(json) as T;
}

export function tryReadJSONPref<T>(
  key: string,
  plistPath: string = PLIST_PATH,
): T | null {
  try {
    return readJSONPref<T>(key, plistPath);
  } catch {
    return null;
  }
}

export function writeJSONPref(
  key: string,
  value: unknown,
  plistPath: string = PLIST_PATH,
): void {
  const json = JSON.stringify(value);
  const base64 = Buffer.from(json, "utf-8").toString("base64");
  runPlutil(["-replace", key, "-data", base64, plistPath]);
  // Force cfprefsd to refresh its cache so a running Spokenly sees the change
  // on its next read. Failing here is non-fatal.
  try {
    execFileSync(DEFAULTS, ["read", BUNDLE_ID, key], { stdio: "ignore" });
  } catch {
    // ignore
  }
}
