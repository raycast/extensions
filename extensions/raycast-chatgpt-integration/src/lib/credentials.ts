import fs from "node:fs/promises";
import { LocalStorage } from "@raycast/api";
import {
  OAUTH_STORAGE_KEY,
  parseCredentials,
  serializeCredentials,
  type StoredCredentials,
} from "./oauth-credentials.js";
import { credentialsPath, PROVIDER_ID } from "./paths.js";

export type { StoredCredentials } from "./oauth-credentials.js";

async function readLegacyFileCredentials(): Promise<StoredCredentials | null> {
  try {
    return parseCredentials(await fs.readFile(credentialsPath(), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    return null;
  }
}

async function migrateLegacyFileCredentials(): Promise<StoredCredentials | null> {
  const credentials = await readLegacyFileCredentials();
  if (!credentials) {
    return null;
  }
  await writeCredentials(credentials);
  await fs.rm(credentialsPath(), { force: true });
  return credentials;
}

export async function readCredentials(): Promise<StoredCredentials | null> {
  const stored = await LocalStorage.getItem<string>(OAUTH_STORAGE_KEY);
  if (stored) {
    return parseCredentials(stored);
  }
  return migrateLegacyFileCredentials();
}

export async function writeCredentials(
  credentials: StoredCredentials,
): Promise<void> {
  await LocalStorage.setItem(
    OAUTH_STORAGE_KEY,
    serializeCredentials(credentials),
  );
}

export async function removeCredentials(): Promise<void> {
  await LocalStorage.removeItem(OAUTH_STORAGE_KEY);
  await fs.rm(credentialsPath(), { force: true });
}

export async function serializeCredentialsForDaemon(): Promise<string> {
  const credentials = await readCredentials();
  if (!credentials) {
    throw new Error(
      "Not signed in. Run the Raycast command: Sign In with ChatGPT.",
    );
  }
  return serializeCredentials(credentials);
}

export function redactedCredentialSummary(
  credentials: StoredCredentials | null,
): string {
  if (!credentials) {
    return "Not signed in";
  }
  const expires = Number.isFinite(credentials.expires)
    ? new Date(credentials.expires).toLocaleString()
    : "unknown";
  return `${credentials.email ?? PROVIDER_ID} expires ${expires}`;
}
