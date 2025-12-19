import { LocalStorage } from "@raycast/api";
import crypto from "node:crypto";
import {
  CreateVaultRecordInput,
  normalizeKeyName,
  normalizeTags,
  UpdateVaultRecordInput,
  VaultRecordId,
  VaultRecordMetadata,
  validateKeyName,
} from "./model";

const RECORDS_KEY = "apiKeyVault:records:v1";
const SECRET_KEY_PREFIX = "apiKeyVault:secret:v1:";

export class DuplicateKeyNameError extends Error {
  readonly keyName: string;

  constructor(keyName: string) {
    super(`A record with keyName '${keyName}' already exists`);
    this.name = "DuplicateKeyNameError";
    this.keyName = keyName;
  }
}

export class RecordNotFoundError extends Error {
  constructor(keyName: string) {
    super(`No record found for keyName '${keyName}'`);
    this.name = "RecordNotFoundError";
  }
}

function secretKey(id: VaultRecordId): string {
  return `${SECRET_KEY_PREFIX}${id}`;
}

async function loadRecords(): Promise<VaultRecordMetadata[]> {
  const raw = await LocalStorage.getItem<string>(RECORDS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as VaultRecordMetadata[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

async function saveRecords(records: VaultRecordMetadata[]): Promise<void> {
  await LocalStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export async function listRecords(): Promise<VaultRecordMetadata[]> {
  const records = await loadRecords();
  return records.slice().sort((a, b) => a.keyName.localeCompare(b.keyName));
}

export async function getRecordByKeyName(
  keyNameRaw: string,
): Promise<VaultRecordMetadata | undefined> {
  const keyName = normalizeKeyName(keyNameRaw);
  const records = await loadRecords();
  return records.find((r) => r.keyName === keyName);
}

export async function keyNameExists(
  keyNameRaw: string,
  opts?: { excludeId?: VaultRecordId },
): Promise<boolean> {
  const keyName = normalizeKeyName(keyNameRaw);
  const records = await loadRecords();
  return records.some((r) => r.keyName === keyName && r.id !== opts?.excludeId);
}

export async function createRecord(
  input: CreateVaultRecordInput,
): Promise<VaultRecordMetadata> {
  const now = new Date().toISOString();
  const keyName = normalizeKeyName(input.keyName);
  const keyNameError = validateKeyName(keyName);
  if (keyNameError) throw new Error(keyNameError);

  const records = await loadRecords();
  if (records.some((r) => r.keyName === keyName))
    throw new DuplicateKeyNameError(keyName);

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

  await saveRecords([...records, record]);
  await setSecret(id, input.apiKey);
  return record;
}

export async function updateRecordByKeyName(
  keyNameRaw: string,
  input: UpdateVaultRecordInput,
): Promise<VaultRecordMetadata> {
  const existing = await getRecordByKeyName(keyNameRaw);
  if (!existing) throw new RecordNotFoundError(keyNameRaw);
  return updateRecordById(existing.id, input);
}

export async function updateRecordById(
  id: VaultRecordId,
  input: UpdateVaultRecordInput,
): Promise<VaultRecordMetadata> {
  const records = await loadRecords();
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
    throw new DuplicateKeyNameError(nextKeyName);
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
  await saveRecords(nextRecords);

  if (input.apiKey !== undefined) {
    await setSecret(id, input.apiKey);
  }

  return updated;
}

export async function deleteRecordByKeyName(keyNameRaw: string): Promise<void> {
  const existing = await getRecordByKeyName(keyNameRaw);
  if (!existing) throw new RecordNotFoundError(keyNameRaw);
  await deleteRecordById(existing.id);
}

export async function deleteRecordById(id: VaultRecordId): Promise<void> {
  const records = await loadRecords();
  const nextRecords = records.filter((r) => r.id !== id);
  await saveRecords(nextRecords);
  await deleteSecret(id);
}

export async function getSecret(
  id: VaultRecordId,
): Promise<string | undefined> {
  return await LocalStorage.getItem<string>(secretKey(id));
}

export async function setSecret(
  id: VaultRecordId,
  value: string,
): Promise<void> {
  await LocalStorage.setItem(secretKey(id), value);
}

export async function deleteSecret(id: VaultRecordId): Promise<void> {
  await LocalStorage.removeItem(secretKey(id));
}
