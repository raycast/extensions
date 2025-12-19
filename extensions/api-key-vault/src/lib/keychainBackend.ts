import {
  CreateVaultRecordInput,
  normalizeKeyName,
  normalizeTags,
  UpdateVaultRecordInput,
  VaultRecordId,
  VaultRecordMetadata,
  validateKeyName,
} from "./model";
import {
  deleteGenericPassword,
  getGenericPassword,
  setGenericPassword,
} from "./keychainCli";
import crypto from "node:crypto";

const KEYCHAIN_SERVICE = "com.raycast.api-key-vault";
const INDEX_ACCOUNT = "__index__";

function secretAccount(id: VaultRecordId): string {
  return `secret:${id}`;
}

async function loadIndex(): Promise<VaultRecordMetadata[]> {
  const raw = await getGenericPassword(KEYCHAIN_SERVICE, INDEX_ACCOUNT);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as VaultRecordMetadata[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveIndex(records: VaultRecordMetadata[]): Promise<void> {
  await setGenericPassword(
    KEYCHAIN_SERVICE,
    INDEX_ACCOUNT,
    JSON.stringify(records),
  );
}

export async function keychainListRecords(): Promise<VaultRecordMetadata[]> {
  const records = await loadIndex();
  return records.slice().sort((a, b) => a.keyName.localeCompare(b.keyName));
}

export async function keychainGetRecordByKeyName(
  keyNameRaw: string,
): Promise<VaultRecordMetadata | undefined> {
  const keyName = normalizeKeyName(keyNameRaw);
  const records = await loadIndex();
  return records.find((r) => r.keyName === keyName);
}

export async function keychainKeyNameExists(
  keyNameRaw: string,
  opts?: { excludeId?: VaultRecordId },
): Promise<boolean> {
  const keyName = normalizeKeyName(keyNameRaw);
  const records = await loadIndex();
  return records.some((r) => r.keyName === keyName && r.id !== opts?.excludeId);
}

export async function keychainCreateRecord(
  input: CreateVaultRecordInput,
): Promise<VaultRecordMetadata> {
  const now = new Date().toISOString();
  const keyName = normalizeKeyName(input.keyName);
  const keyNameError = validateKeyName(keyName);
  if (keyNameError) throw new Error(keyNameError);

  const records = await loadIndex();
  if (records.some((r) => r.keyName === keyName)) {
    throw new Error(`A record with keyName '${keyName}' already exists`);
  }

  const id = crypto.randomUUID();
  const record: VaultRecordMetadata = {
    id,
    keyName,
    application: input.application.trim(),
    service: input.service.trim(),
    tags: normalizeTags(input.tags),
    createdAt: now,
    updatedAt: now,
  };

  await setGenericPassword(KEYCHAIN_SERVICE, secretAccount(id), input.apiKey);
  await saveIndex([...records, record]);
  return record;
}

export async function keychainUpdateRecordById(
  id: VaultRecordId,
  input: UpdateVaultRecordInput,
): Promise<VaultRecordMetadata> {
  const records = await loadIndex();
  const index = records.findIndex((r) => r.id === id);
  if (index === -1) throw new Error("Record not found");

  const existing = records[index];
  const nextKeyName =
    input.keyName !== undefined
      ? normalizeKeyName(input.keyName)
      : existing.keyName;
  const keyNameError = validateKeyName(nextKeyName);
  if (keyNameError) throw new Error(keyNameError);

  if (records.some((r) => r.keyName === nextKeyName && r.id !== id)) {
    throw new Error(`A record with keyName '${nextKeyName}' already exists`);
  }

  const updated: VaultRecordMetadata = {
    ...existing,
    keyName: nextKeyName,
    application:
      input.application !== undefined
        ? input.application.trim()
        : existing.application,
    service:
      input.service !== undefined ? input.service.trim() : existing.service,
    tags: input.tags !== undefined ? normalizeTags(input.tags) : existing.tags,
    updatedAt: new Date().toISOString(),
  };

  const nextRecords = records.slice();
  nextRecords[index] = updated;
  await saveIndex(nextRecords);

  if (input.apiKey !== undefined) {
    await setGenericPassword(KEYCHAIN_SERVICE, secretAccount(id), input.apiKey);
  }

  return updated;
}

export async function keychainDeleteRecordById(
  id: VaultRecordId,
): Promise<void> {
  const records = await loadIndex();
  const nextRecords = records.filter((r) => r.id !== id);
  await saveIndex(nextRecords);
  await deleteGenericPassword(KEYCHAIN_SERVICE, secretAccount(id));
}

export async function keychainGetSecret(
  id: VaultRecordId,
): Promise<string | undefined> {
  return await getGenericPassword(KEYCHAIN_SERVICE, secretAccount(id));
}
