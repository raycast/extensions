import { readFileSync } from "node:fs";

let cachedVersion: string | undefined;

export function getAppVersionFromPackage(): string {
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    const raw = readFileSync(new URL("../package.json", import.meta.url), "utf8");
    const parsed = JSON.parse(raw) as { version?: string };
    cachedVersion = parsed.version ?? "unknown";
    return cachedVersion;
  } catch {
    cachedVersion = "unknown";
    return cachedVersion;
  }
}
