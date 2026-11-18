import { LocalStorage } from "@raycast/api";

const STORAGE_KEY = "dbCredentialsById";

type StoredCredentials = Record<string, string>;

async function readAll(): Promise<StoredCredentials> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!stored) return {};
  try {
    const parsed = JSON.parse(stored) as StoredCredentials;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeAll(data: StoredCredentials): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function getAllDatabaseCredentials(): Promise<StoredCredentials> {
  return readAll();
}

export async function getDatabaseCredential(dbId: string): Promise<string> {
  const data = await readAll();
  return typeof data[dbId] === "string" ? data[dbId] : "";
}

export async function setDatabaseCredential(dbId: string, connectionString: string): Promise<void> {
  const trimmed = connectionString.trim();
  const data = await readAll();
  if (trimmed) {
    data[dbId] = trimmed;
  } else {
    delete data[dbId];
  }
  await writeAll(data);
}

export async function removeDatabaseCredential(dbId: string): Promise<void> {
  const data = await readAll();
  delete data[dbId];
  await writeAll(data);
}
