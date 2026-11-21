import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

/** Details the Pritunl app shows for a profile that `pritunl-client list` leaves out. */
export interface ProfileInfo {
  user?: string;
  organization?: string;
  protocol?: "WireGuard" | "OpenVPN";
}

const PROFILES_DIR = join(homedir(), "Library", "Application Support", "pritunl", "profiles");

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * Reads the profile's `.conf` file from the Pritunl app. The file also holds sync secrets,
 * so only the fields below are kept. Returns nothing for profiles stored elsewhere, such as
 * system profiles.
 */
export async function readProfileInfo(id: string): Promise<ProfileInfo> {
  if (!/^[a-z0-9]+$/i.test(id)) return {};

  try {
    const conf = JSON.parse(await readFile(join(PROFILES_DIR, `${id}.conf`), "utf8"));
    return {
      user: text(conf.user),
      organization: text(conf.organization),
      protocol: typeof conf.wg === "boolean" ? (conf.wg ? "WireGuard" : "OpenVPN") : undefined,
    };
  } catch {
    return {};
  }
}

/** Reads every profile's info at once, so switching between profiles never waits on a file. */
export async function readProfileInfos(ids: string[]): Promise<Record<string, ProfileInfo>> {
  const infos = await Promise.all(ids.map(readProfileInfo));
  return Object.fromEntries(ids.map((id, index) => [id, infos[index]]));
}
