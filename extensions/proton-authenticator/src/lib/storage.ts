import { readFile } from "fs/promises";
import { LocalStorage } from "@raycast/api";
import { ProtonExport, TOTPAccount, ImportMode, LoadResult } from "../types";
import { parseOtpAuthUri } from "./parser";
import { STORAGE_KEYS } from "./constants";
import { loadAccountsFromDatabase } from "./database";
import { validateAndParseKey } from "./crypto";

export async function getImportMode(): Promise<ImportMode | null> {
  const mode = await LocalStorage.getItem<string>(STORAGE_KEYS.IMPORT_MODE);
  if (mode === "json" || mode === "sqlite") {
    return mode;
  }
  return null;
}

export async function setImportMode(mode: ImportMode): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.IMPORT_MODE, mode);
}

export async function getEncryptionKeys(): Promise<string[]> {
  const keys = await LocalStorage.getItem<string>(STORAGE_KEYS.ENCRYPTION_KEYS);
  if (keys) {
    try {
      const parsed: unknown = JSON.parse(keys);
      if (Array.isArray(parsed)) {
        return parsed.filter((key): key is string => typeof key === "string");
      }
    } catch (error) {
      console.error("Failed to parse stored encryption keys:", error);
    }
    return [];
  }
  const legacyKey = await LocalStorage.getItem<string>(STORAGE_KEYS.ENCRYPTION_KEY);
  return legacyKey ? [legacyKey] : [];
}

export async function setEncryptionKeys(keys: string[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.ENCRYPTION_KEYS, JSON.stringify(keys));
  await LocalStorage.removeItem(STORAGE_KEYS.ENCRYPTION_KEY);
}

export async function getParsedEncryptionKeys(): Promise<Buffer[]> {
  const keys = await getEncryptionKeys();
  return keys.map(validateAndParseKey).filter((key): key is Buffer => key !== null);
}

export async function loadAccountsFromStorage(): Promise<LoadResult> {
  try {
    const mode = await getImportMode();

    if (mode === "sqlite") {
      const { accounts, missingKeys, undecodableCount } = await loadAccountsFromDatabase(
        await getParsedEncryptionKeys(),
      );
      return { accounts, missingKeys, undecodableCount };
    }

    // Default to JSON mode
    const storedData = await LocalStorage.getItem<string>(STORAGE_KEYS.PROTON_EXPORT);
    if (!storedData) {
      return { accounts: [], missingKeys: [], undecodableCount: 0 };
    }

    const exportData: ProtonExport = JSON.parse(storedData);
    return { accounts: parseProtonExport(exportData), missingKeys: [], undecodableCount: 0 };
  } catch (error) {
    console.error("Failed to read from storage:", error);
    throw error;
  }
}

export async function saveAccountsToStorage(filePath: string): Promise<TOTPAccount[]> {
  try {
    const fileContent = await readFile(filePath, "utf8");
    const exportData: ProtonExport = JSON.parse(fileContent);

    if (!validateProtonExport(exportData)) {
      throw new Error("Invalid Proton Authenticator export format");
    }

    await LocalStorage.setItem(STORAGE_KEYS.PROTON_EXPORT, fileContent);

    return parseProtonExport(exportData);
  } catch (error) {
    console.error("Failed to save to storage:", error);
    throw error;
  }
}

function validateProtonExport(data: ProtonExport) {
  return (
    data &&
    Array.isArray(data.entries) &&
    data.entries.length > 0 &&
    data.entries.every(
      (entry) =>
        entry.id && entry.content && entry.content.entry_type === "Totp" && entry.content.uri && entry.content.name,
    )
  );
}

function parseProtonExport(exportData: ProtonExport): TOTPAccount[] {
  const accounts: TOTPAccount[] = [];

  for (const entry of exportData.entries) {
    if (entry.content.entry_type === "Totp") {
      const parsed = parseOtpAuthUri(entry.content.uri);
      if (parsed) {
        accounts.push({
          id: entry.id,
          ...parsed,
        });
      }
    }
  }

  return accounts;
}

export async function clearStoredData(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEYS.PROTON_EXPORT);
  await LocalStorage.removeItem(STORAGE_KEYS.IMPORT_MODE);
  await LocalStorage.removeItem(STORAGE_KEYS.ENCRYPTION_KEY);
  await LocalStorage.removeItem(STORAGE_KEYS.ENCRYPTION_KEYS);
}
