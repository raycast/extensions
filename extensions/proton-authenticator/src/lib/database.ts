import { execSync } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { TOTPAccount } from "../types";
import { decryptEntry } from "./crypto";
import { decodeAuthenticatorEntry } from "./protobuf";
import { parseOtpAuthUri } from "./parser";

export function getDatabasePath(): string {
  return join(
    homedir(),
    "Library/Group Containers/group.me.proton.authenticator/Library/Application Support/default.store",
  );
}

export function databaseExists(): boolean {
  return existsSync(getDatabasePath());
}

export async function loadAccountsFromDatabase(key: Buffer): Promise<TOTPAccount[]> {
  const dbPath = getDatabasePath();

  if (!existsSync(dbPath)) {
    throw new Error(
      "Proton Authenticator database not found. Please ensure the app is installed and has been opened at least once.",
    );
  }

  // Use sqlite3 CLI to query the database (handles WAL mode properly)
  // Output format: ZID|hex(ZENCRYPTEDDATA)
  const query = "SELECT ZID, hex(ZENCRYPTEDDATA) FROM ZENCRYPTEDENTRYENTITY";
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
    return [];
  }

  const accounts: TOTPAccount[] = [];
  const lines = output.trim().split("\n");

  for (const line of lines) {
    const separatorIndex = line.indexOf("|");
    if (separatorIndex === -1) continue;

    const zid = line.substring(0, separatorIndex);
    const hexData = line.substring(separatorIndex + 1);

    if (!hexData) continue;

    try {
      const encryptedData = Buffer.from(hexData, "hex");
      const decryptedBuffer = decryptEntry(encryptedData, key);
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
      console.error(`Failed to decrypt entry ${zid}:`, error);
      throw error;
    }
  }

  return accounts;
}
