import { execf } from "./exec";

export interface OSInfo {
  release: string;
  build: string;
  display: string;
}

/** Reports exactly what sw_vers exposes. Marketing codenames are deliberately
 *  not shown: macOS provides no programmatic source for them, so any mapping
 *  would be a hand-maintained list that goes stale with every release. */
export async function getOSInfo(): Promise<OSInfo> {
  const output = await execf("/usr/bin/sw_vers");
  const versionMatch = output.match(/ProductVersion:\s*(.+)/);
  const buildMatch = output.match(/BuildVersion:\s*(.+)/);
  const release = versionMatch?.[1]?.trim() ?? "Unknown";
  const build = buildMatch?.[1]?.trim() ?? "Unknown";

  return { release, build, display: `macOS ${release} (${build})` };
}
