import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Account } from "./accounts.ts";
import { decodeBase32, type Algorithm } from "./totp.ts";

type BackupFile = {
  version: 1;
  salt: string;
  iv: string;
  tag: string;
  ciphertext: string;
};

export async function exportBackup(accounts: Account[], password: string): Promise<string> {
  if (password.length < 8) throw new Error("Passphrase must be at least 8 characters.");

  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(password, salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(accounts), "utf8"), cipher.final()]);
  const backup: BackupFile = {
    version: 1,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
  const filename = `totp-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const path = join(homedir(), "Downloads", filename);
  await writeFile(path, JSON.stringify(backup), { encoding: "utf8", mode: 0o600 });
  return path;
}

export async function importBackup(path: string, password: string): Promise<Account[]> {
  const backup = JSON.parse(await readFile(path, "utf8")) as BackupFile;
  if (backup.version !== 1 || !backup.salt || !backup.iv || !backup.tag || !backup.ciphertext) {
    throw new Error("This is not a TOTP backup file.");
  }

  try {
    const tag = Buffer.from(backup.tag, "base64");
    if (tag.length !== 16) throw new Error("Invalid backup authentication tag.");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      deriveKey(password, Buffer.from(backup.salt, "base64")),
      Buffer.from(backup.iv, "base64"),
      { authTagLength: 16 },
    );
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(Buffer.from(backup.ciphertext, "base64")), decipher.final()]);
    return validateAccounts(JSON.parse(plaintext.toString("utf8")));
  } catch {
    throw new Error("Wrong passphrase or corrupt backup file.");
  }
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, 32);
}

function validateAccounts(value: unknown): Account[] {
  if (!Array.isArray(value)) throw new Error("Backup contains invalid accounts.");

  return value.map((account) => {
    if (!account || typeof account !== "object") throw new Error("Backup contains invalid accounts.");
    const item = account as Record<string, unknown>;
    if (
      typeof item.id !== "string" || typeof item.name !== "string" || typeof item.issuer !== "string" || typeof item.secret !== "string" ||
      !Number.isInteger(item.digits) || !Number.isInteger(item.period) ||
      !["SHA1", "SHA256", "SHA512"].includes(item.algorithm as string)
    ) {
      throw new Error("Backup contains invalid accounts.");
    }
    const digits = item.digits as number;
    const period = item.period as number;
    decodeBase32(item.secret);
    if (digits < 1 || digits > 10 || period < 1) throw new Error("Backup contains invalid accounts.");
    return { id: item.id, name: item.name, issuer: item.issuer, secret: item.secret, digits, period, algorithm: item.algorithm as Algorithm };
  });
}
