import { createHash, randomUUID } from "node:crypto";
import { fakerKey } from "@chrismessina/raycast-faker";
import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { getOrganization, log, MercuryAuthError } from "./mercury";

/**
 * One connected Mercury account (an organization, in API terms): a personal or a business login.
 * Mercury scopes each API token to one organization, and no endpoint lists a person's other
 * organizations, so each one is added with its own token.
 *
 * Stored in LocalStorage, which Raycast keeps in its local encrypted database, isolated per
 * extension. Never pass a token as a hook argument: arguments become cache keys on disk.
 */
export interface MercuryLogin {
  id: string;
  token: string;
  orgId: string;
  name: string;
  kind: "personal" | "business";
}

const STORAGE_KEY = "mercury-logins";
/** SHA-256 of the legacy preference token last imported, so a removed login is not re-imported. */
const LEGACY_FINGERPRINT_KEY = "legacy-token-fingerprint";

async function readLogins(): Promise<MercuryLogin[]> {
  const raw = await LocalStorage.getItem<string>(fakerKey(STORAGE_KEY));
  return raw ? (JSON.parse(raw) as MercuryLogin[]) : [];
}

async function writeLogins(logins: MercuryLogin[]) {
  await LocalStorage.setItem(fakerKey(STORAGE_KEY), JSON.stringify(logins));
}

function fingerprint(token: string) {
  return createHash("sha256").update(token.trim()).digest("hex");
}

/**
 * Versions before Manage Accounts kept one token in the `apiKey` preference. Import it once so
 * existing users don't have to generate a new token (Mercury shows a token only when it's created).
 */
async function importLegacyToken(logins: MercuryLogin[]): Promise<MercuryLogin[]> {
  const { apiKey } = getPreferenceValues<Preferences>();
  if (!apiKey?.trim()) return logins;
  const print = fingerprint(apiKey);
  if ((await LocalStorage.getItem<string>(fakerKey(LEGACY_FINGERPRINT_KEY))) === print) return logins;

  try {
    const result = await saveLogin(apiKey);
    await LocalStorage.setItem(fakerKey(LEGACY_FINGERPRINT_KEY), print);
    log.log("Imported legacy API key", { name: result.login.name });
    return readLogins();
  } catch (error) {
    // A rejected token will never succeed, so stop retrying it. A network failure might, so leave it.
    if (error instanceof MercuryAuthError) await LocalStorage.setItem(fakerKey(LEGACY_FINGERPRINT_KEY), print);
    log.log("Legacy API key not imported:", error instanceof Error ? error.message : String(error));
    return logins;
  }
}

export async function loadLogins(): Promise<MercuryLogin[]> {
  return importLegacyToken(await readLogins());
}

export function displayName(organization: {
  legalBusinessName: string;
  dbas: Array<{ dbaName: string; dbaIsDefault: boolean }>;
}) {
  return organization.dbas.find((dba) => dba.dbaIsDefault)?.dbaName || organization.legalBusinessName;
}

/**
 * Check a token against Mercury and save it. A token for an organization that's already added
 * replaces the old one, which is how an expired or rotated token gets updated.
 */
export async function saveLogin(
  token: string,
  /** When updating a token, the login it must belong to. A token for another organization is refused. */
  replacing?: MercuryLogin,
): Promise<{ login: MercuryLogin; replaced: boolean }> {
  const organization = await getOrganization(token);
  if (replacing && organization.id !== replacing.orgId) {
    throw new Error(`That token belongs to ${displayName(organization)}, not ${replacing.name}.`);
  }
  const logins = await readLogins();
  const existing = logins.find((login) => login.orgId === organization.id);
  const login: MercuryLogin = {
    id: existing?.id ?? randomUUID(),
    token: token.trim(),
    orgId: organization.id,
    name: displayName(organization),
    kind: organization.kind,
  };
  await writeLogins(existing ? logins.map((item) => (item.id === login.id ? login : item)) : [...logins, login]);
  return { login, replaced: Boolean(existing) };
}

export async function hasLogin(id: string) {
  return (await readLogins()).some((login) => login.id === id);
}

export async function removeLogin(id: string) {
  await writeLogins((await readLogins()).filter((login) => login.id !== id));
  await LocalStorage.removeItem(fakerKey(`balances:${id}`));
}

/** For AI tools: every saved login, or an error that tells the user what to do. */
export async function requireLogins(): Promise<MercuryLogin[]> {
  const logins = await loadLogins();
  if (logins.length === 0)
    throw new Error("No Mercury account is connected. Add one with the Manage Accounts command.");
  return logins;
}
