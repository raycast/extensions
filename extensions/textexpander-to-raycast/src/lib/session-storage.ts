import { environment, LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseSession, serializeSession } from "./migration";
import type { MigrationSession } from "./types";

const legacyKey = "migration-progress-v1";
const savedAtKey = "migration-progress-saved-at";
const snapshotPath = join(environment.supportPath, "migration-progress.json");

export async function saveProgress(session: MigrationSession) {
  const text = serializeSession(session);
  await mkdir(environment.supportPath, { recursive: true, mode: 0o700 });
  const temporaryPath = join(environment.supportPath, `migration-progress-${randomUUID()}.tmp`);
  try {
    await writeFile(temporaryPath, text, { flag: "wx", mode: 0o600 });
    await rename(temporaryPath, snapshotPath);
  } catch (error) {
    await Promise.allSettled([rm(temporaryPath, { force: true })]);
    throw error;
  }
  await LocalStorage.setItem(savedAtKey, new Date().toISOString());
  await LocalStorage.removeItem(legacyKey);
}

export async function loadProgress(): Promise<MigrationSession | undefined> {
  try {
    return parseSession(await readFile(snapshotPath, "utf8"));
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  const legacy = await LocalStorage.getItem<string>(legacyKey);
  if (!legacy) return undefined;
  const session = parseSession(legacy);
  await saveProgress(session);
  return session;
}

export async function deleteProgress() {
  await rm(snapshotPath, { force: true });
  await LocalStorage.removeItem(legacyKey);
  await LocalStorage.removeItem(savedAtKey);
}
