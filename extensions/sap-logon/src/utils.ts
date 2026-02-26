import { LocalStorage, environment } from "@raycast/api";
import { SAPSystem } from "./types";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";

const SYSTEMS_KEY = "sap-systems";
const ENCRYPTION_KEY_STORAGE = "sap-encryption-key";
const SAPC_FILE_CLEANUP_DELAY_MS = 5000;

let cachedEncryptionKey: Buffer | null = null;
let keyInitPromise: Promise<Buffer> | null = null;
let storageMutex: Promise<void> = Promise.resolve();

async function getOrCreateEncryptionKey(): Promise<Buffer> {
  if (cachedEncryptionKey) {
    return cachedEncryptionKey;
  }

  // Prevent race condition by reusing the same promise for concurrent calls
  if (keyInitPromise) {
    return keyInitPromise;
  }

  keyInitPromise = (async () => {
    const storedKey = await LocalStorage.getItem<string>(ENCRYPTION_KEY_STORAGE);

    if (storedKey) {
      cachedEncryptionKey = Buffer.from(storedKey, "hex");
      return cachedEncryptionKey;
    }

    // Generate a unique 32-byte key for this installation
    const newKey = crypto.randomBytes(32);
    await LocalStorage.setItem(ENCRYPTION_KEY_STORAGE, newKey.toString("hex"));
    cachedEncryptionKey = newKey;
    return newKey;
  })();

  try {
    return await keyInitPromise;
  } finally {
    keyInitPromise = null;
  }
}

export async function encryptPassword(password: string): Promise<string> {
  const iv = crypto.randomBytes(16);
  const key = await getOrCreateEncryptionKey();
  const cipher = crypto.createCipheriv("aes-256-cbc", key as crypto.CipherKey, iv as crypto.BinaryLike);
  let encrypted = cipher.update(password, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export async function decryptPassword(encryptedPassword: string): Promise<string> {
  try {
    if (!encryptedPassword || !encryptedPassword.includes(":")) {
      console.warn("decryptPassword: Invalid encrypted password format (missing separator)");
      return "";
    }
    const parts = encryptedPassword.split(":");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      console.warn("decryptPassword: Invalid encrypted password format (invalid parts)");
      return "";
    }
    const [ivHex, encrypted] = parts;
    if (!/^[0-9a-fA-F]{32}$/.test(ivHex)) {
      console.warn("decryptPassword: Invalid IV format");
      return "";
    }
    const iv = Buffer.from(ivHex, "hex");
    const key = await getOrCreateEncryptionKey();
    const decipher = crypto.createDecipheriv("aes-256-cbc", key as crypto.CipherKey, iv as crypto.BinaryLike);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("decryptPassword: Decryption failed", error instanceof Error ? error.message : error);
    return "";
  }
}

function isValidSAPSystem(obj: unknown): obj is SAPSystem {
  if (typeof obj !== "object" || obj === null) return false;
  const system = obj as Record<string, unknown>;
  return (
    typeof system.id === "string" &&
    typeof system.systemId === "string" &&
    typeof system.applicationServer === "string" &&
    typeof system.instanceNumber === "string" &&
    typeof system.client === "string" &&
    typeof system.username === "string" &&
    typeof system.language === "string" &&
    typeof system.createdAt === "string" &&
    typeof system.updatedAt === "string"
  );
}

export async function getSAPSystems(): Promise<SAPSystem[]> {
  const systemsJson = await LocalStorage.getItem<string>(SYSTEMS_KEY);
  if (!systemsJson) return [];
  try {
    const parsed = JSON.parse(systemsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidSAPSystem);
  } catch {
    return [];
  }
}

export async function saveSAPSystems(systems: SAPSystem[]): Promise<void> {
  await LocalStorage.setItem(SYSTEMS_KEY, JSON.stringify(systems));
}

export async function getPassword(systemId: string): Promise<string> {
  const encryptedPassword = await LocalStorage.getItem<string>(`password-${systemId}`);
  if (!encryptedPassword) return "";
  return await decryptPassword(encryptedPassword);
}

export async function savePassword(systemId: string, password: string): Promise<void> {
  const encrypted = await encryptPassword(password);
  await LocalStorage.setItem(`password-${systemId}`, encrypted);
}

export async function deletePassword(systemId: string): Promise<void> {
  await LocalStorage.removeItem(`password-${systemId}`);
}

async function withStorageLock<T>(fn: () => Promise<T>): Promise<T> {
  const previousMutex = storageMutex;
  let resolve: () => void;
  storageMutex = new Promise<void>((r) => {
    resolve = r;
  });
  await previousMutex;
  try {
    return await fn();
  } finally {
    resolve!();
  }
}

export async function addSAPSystem(
  system: Omit<SAPSystem, "id" | "createdAt" | "updatedAt">,
  password: string,
): Promise<SAPSystem> {
  return withStorageLock(async () => {
    const systems = await getSAPSystems();

    // Check for duplicate system (same server, instance, client, and username)
    const duplicate = systems.find(
      (s) =>
        s.applicationServer.toLowerCase() === system.applicationServer.toLowerCase() &&
        s.instanceNumber === system.instanceNumber &&
        s.client === system.client &&
        s.username.toLowerCase() === system.username.toLowerCase(),
    );
    if (duplicate) {
      throw new Error(
        `A system with server "${system.applicationServer}", instance ${system.instanceNumber}, client ${system.client}, and user "${system.username}" already exists`,
      );
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newSystem: SAPSystem = {
      ...system,
      id,
      createdAt: now,
      updatedAt: now,
    };

    systems.push(newSystem);
    await saveSAPSystems(systems);
    await savePassword(id, password);

    return newSystem;
  });
}

export async function updateSAPSystem(
  id: string,
  updates: Partial<Omit<SAPSystem, "id" | "createdAt">>,
  password?: string,
): Promise<void> {
  return withStorageLock(async () => {
    const systems = await getSAPSystems();
    const index = systems.findIndex((s) => s.id === id);

    if (index !== -1) {
      systems[index] = {
        ...systems[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await saveSAPSystems(systems);

      if (password !== undefined) {
        await savePassword(id, password);
      }
    }
  });
}

export async function deleteSAPSystem(id: string): Promise<void> {
  return withStorageLock(async () => {
    const systems = await getSAPSystems();
    const filtered = systems.filter((s) => s.id !== id);
    await saveSAPSystems(filtered);
    await deletePassword(id);
  });
}

// Sanitize filename to prevent path traversal attacks
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

// Encode value for SAP connection string (avoid breaking on special chars)
function encodeSAPValue(value: string): string {
  // Encode all characters that could break the SAP connection string parsing
  return value
    .replace(/%/g, "%25") // Must be first to avoid double-encoding
    .replace(/&/g, "%26")
    .replace(/=/g, "%3D")
    .replace(/\+/g, "%2B")
    .replace(/#/g, "%23")
    .replace(/\s/g, "%20");
}

export async function createAndOpenSAPCFile(system: SAPSystem): Promise<string> {
  const password = await getPassword(system.id);

  // Build the connection string with encoded values
  // Format: conn=/H/{application server}/S/32{instance number}&user={username}&lang={language}&client={client}&pass={password}
  const connectionString = `conn=/H/${encodeSAPValue(system.applicationServer)}/S/32${encodeSAPValue(system.instanceNumber)}&user=${encodeSAPValue(system.username)}&lang=${encodeSAPValue(system.language)}&clnt=${encodeSAPValue(system.client)}&pass=${encodeSAPValue(password)}`;

  // Use Raycast's support path for temp files (more appropriate than os.tmpdir)
  const tempDir = path.join(environment.supportPath, "sapc-files");
  try {
    await fs.access(tempDir);
  } catch {
    await fs.mkdir(tempDir, { recursive: true });
  }

  // Sanitize filename to prevent path injection
  const sanitizedSystemId = sanitizeFilename(system.systemId);
  const sanitizedClient = sanitizeFilename(system.client);
  const fileName = `${sanitizedSystemId}_${sanitizedClient}.sapc`;
  const filePath = path.join(tempDir, fileName);

  // Write file with restrictive permissions (owner read/write only)
  await fs.writeFile(filePath, connectionString, { encoding: "utf8", mode: 0o600 });

  // Schedule cleanup to remove sensitive data from disk
  setTimeout(async () => {
    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
    } catch {
      // Ignore cleanup errors - file may already be deleted
    }
  }, SAPC_FILE_CLEANUP_DELAY_MS);

  return filePath;
}

// Clean up SAPC files to remove sensitive data from disk
export async function cleanupSAPCFiles(): Promise<void> {
  try {
    const tempDir = path.join(environment.supportPath, "sapc-files");
    await fs.access(tempDir);
    const files = await fs.readdir(tempDir);
    await Promise.all(
      files.filter((file) => file.endsWith(".sapc")).map((file) => fs.unlink(path.join(tempDir, file)).catch(() => {})),
    );
  } catch {
    // Ignore cleanup errors - directory may not exist
  }
}

export function validateInstanceNumber(value: string): string | undefined {
  if (!/^\d{2}$/.test(value)) {
    return "Instance number must be exactly 2 digits (e.g., 00, 01, 99)";
  }
  return undefined;
}

export function validateClient(value: string): string | undefined {
  if (!/^\d{3}$/.test(value)) {
    return "Client must be exactly 3 digits (e.g., 100, 800)";
  }
  return undefined;
}
