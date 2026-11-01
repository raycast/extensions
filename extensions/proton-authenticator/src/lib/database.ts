import { execSync } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { LoadResult, TOTPAccount } from "../types";
import { decryptEntry } from "./crypto";
import { decodeAuthenticatorEntry } from "./protobuf";
import { parseOtpAuthUri } from "./parser";

export interface DatabaseLoadResult extends LoadResult {
  // keys that decrypted at least one entry
  usedKeys: Buffer[];
}

export function getDatabasePath(): string {
  return join(
    homedir(),
    "Library/Group Containers/group.me.proton.authenticator/Library/Application Support/default.store",
  );
}

export function databaseExists(): boolean {
  return existsSync(getDatabasePath());
}

export async function loadAccountsFromDatabase(keys: Buffer[]): Promise<DatabaseLoadResult> {
  const dbPath = getDatabasePath();

  if (!existsSync(dbPath)) {
    throw new Error(
      "Proton Authenticator database not found. Please ensure the app is installed and has been opened at least once.",
    );
  }

  // Use sqlite3 CLI to query the database (handles WAL mode properly)
  // Output format: ZID|ZKEYID|hex(ZENCRYPTEDDATA)
  const query = "SELECT ZID, ZKEYID, hex(ZENCRYPTEDDATA) FROM ZENCRYPTEDENTRYENTITY";
  let output: string;

  try {
    output = execSync(`sqlite3 "${dbPath}" "${query}"`, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
  } catch {
    throw new Error("Failed to query database. Make sure sqlite3 is available.");
  }

  if (!output.trim()) {
    return { accounts: [], missingKeys: [], undecodableCount: 0, usedKeys: [] };
  }

  // Each entry is encrypted with the Keychain key named by its ZKEYID. Proton Authenticator creates one key
  // per device plus one for Proton account sync, so a database can mix several keys. The first key that
  // decrypts an entry is reused for every other entry with the same ZKEYID.
  const keyById = new Map<string, Buffer>();
  const missingCounts = new Map<string, number>();
  let undecodableCount = 0;
  const accounts: TOTPAccount[] = [];
  const lines = output.trim().split("\n");

  for (const line of lines) {
    const [zid, keyId, hexData] = line.split("|");

    if (!hexData) continue;

    const decryptedBuffer = decryptWithKeyId(Buffer.from(hexData, "hex"), keyId, keys, keyById);
    if (!decryptedBuffer) {
      missingCounts.set(keyId, (missingCounts.get(keyId) ?? 0) + 1);
      continue;
    }

    try {
      const entry = await decodeAuthenticatorEntry(decryptedBuffer);

      if (entry.content.totp?.uri) {
        const parsed = parseOtpAuthUri(entry.content.totp.uri);
        if (parsed) {
          accounts.push({
            id: entry.metadata.id || zid,
            ...parsed,
          });
        }
      }
    } catch (error) {
      console.error(`Failed to decode entry ${zid}:`, error);
      undecodableCount++;
    }
  }

  return {
    accounts,
    missingKeys: [...missingCounts].map(([keyId, entryCount]) => ({ keyId, entryCount })),
    undecodableCount,
    usedKeys: [...new Set(keyById.values())],
  };
}

function decryptWithKeyId(
  encryptedData: Buffer,
  keyId: string,
  keys: Buffer[],
  keyById: Map<string, Buffer>,
): Buffer | null {
  const knownKey = keyById.get(keyId);

  for (const key of knownKey ? [knownKey] : keys) {
    try {
      const decrypted = decryptEntry(encryptedData, key);
      keyById.set(keyId, key);
      return decrypted;
    } catch {
      // Wrong key, GCM authentication failed
    }
  }

  return null;
}
