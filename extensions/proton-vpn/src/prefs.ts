import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { promisify } from "node:util";

const exec = promisify(execFile);

const DEFAULTS = "/usr/bin/defaults";

/** Preferences domain of the sandboxed Proton VPN app, addressed by path. */
export const PREFS_DOMAIN = `${homedir()}/Library/Containers/ch.protonvpn.mac/Data/Library/Preferences/ch.protonvpn.mac`;

export async function exportPrefsXml(): Promise<string> {
  const { stdout } = await exec(DEFAULTS, ["export", PREFS_DOMAIN, "-"], {
    maxBuffer: 32 * 1024 * 1024,
  });
  return stdout;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getStringKey(xml: string, key: string): string | undefined {
  const match = xml.match(
    new RegExp(`<key>${escapeRegExp(key)}</key>\\s*<string>([^<]*)</string>`),
  );
  return match?.[1];
}

export function getIntegerKey(xml: string, key: string): number | undefined {
  const match = xml.match(
    new RegExp(
      `<key>${escapeRegExp(key)}</key>\\s*<integer>(-?\\d+)</integer>`,
    ),
  );
  return match ? Number(match[1]) : undefined;
}

export function getDataKeyAsJson<T>(xml: string, key: string): T | undefined {
  const match = xml.match(
    new RegExp(`<key>${escapeRegExp(key)}</key>\\s*<data>([\\s\\S]*?)</data>`),
  );
  if (!match) return undefined;
  try {
    const text = Buffer.from(match[1].replace(/\s/g, ""), "base64").toString(
      "utf-8",
    );
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

export async function writeBool(key: string, value: boolean): Promise<void> {
  await exec(DEFAULTS, [
    "write",
    PREFS_DOMAIN,
    key,
    "-bool",
    value ? "true" : "false",
  ]);
}

export async function writeString(key: string, value: string): Promise<void> {
  await exec(DEFAULTS, ["write", PREFS_DOMAIN, key, "-string", value]);
}

export async function writeInt(key: string, value: number): Promise<void> {
  await exec(DEFAULTS, ["write", PREFS_DOMAIN, key, "-int", String(value)]);
}

export async function writeDataJson(
  key: string,
  value: unknown,
): Promise<void> {
  const hex = Buffer.from(JSON.stringify(value), "utf-8").toString("hex");
  await exec(DEFAULTS, ["write", PREFS_DOMAIN, key, "-data", hex]);
}

export interface ProtonIdentity {
  username: string;
  userId: string;
  tier: number;
}

export interface PreparedServer {
  name?: string;
  city?: string;
  exitCountryCode?: string;
  load?: number;
}

/** Read the signed-in account identity from the app preferences. */
export async function getIdentity(xml?: string): Promise<ProtonIdentity> {
  const prefs = xml ?? (await exportPrefsXml());

  // Per-user keys look like "announcements_<username>"
  const username = prefs.match(/<key>announcements_([^<]+)<\/key>/)?.[1];

  // Prefer the suffix of an existing profiles_ key, else the feature-flag user id
  const userId =
    prefs.match(/<key>profiles_([^<]+)<\/key>/)?.[1] ??
    getStringKey(prefs, "protoncore.featureflag.userId");

  const tier = getIntegerKey(prefs, "userTier") ?? 0;

  if (!username || !userId) {
    throw new Error(
      "No signed-in account was found. Open the Proton VPN app and sign in first.",
    );
  }
  return { username, userId, tier };
}

export function getPreparedServer(xml: string): PreparedServer | undefined {
  return getDataKeyAsJson<PreparedServer>(xml, "LastPreparingServer");
}

export function getUserLocation(
  xml: string,
): { country?: string; IP?: string } | undefined {
  return getDataKeyAsJson<{ country?: string; IP?: string }>(
    xml,
    "UserLocation",
  );
}
