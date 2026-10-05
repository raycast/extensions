import { randomUUID } from "node:crypto";
import {
  access,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  rmdir,
  stat,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

type IntegrationManifest = {
  schemaVersion: number;
  storagePath: string;
  environmentsPath?: string;
};

export type StorageConfiguration = {
  storagePath: string;
  environmentsPath: string;
};

export type DeepLink = {
  id: string;
  title: string;
  urlString: string;
  group: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NewDeepLink = {
  title: string;
  urlString: string;
  group: string;
  tags: string[];
  isFavorite: boolean;
};

export async function resolveStorageConfiguration(storageOverride?: string): Promise<StorageConfiguration> {
  const applicationSupport = path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "com.stefan.SimulatorDeepLinker",
  );
  return resolveStorageConfigurationAt(applicationSupport, storageOverride);
}

export async function resolveStorageConfigurationAt(
  applicationSupport: string,
  storageOverride?: string,
): Promise<StorageConfiguration> {
  if (storageOverride) {
    await assertAccessibleFile(storageOverride, "Storage Override");
    return {
      storagePath: storageOverride,
      environmentsPath: path.join(path.dirname(storageOverride), "environments.json"),
    };
  }

  const manifestPath = path.join(applicationSupport, "integration.json");
  let manifestSource: string;

  try {
    manifestSource = await readFile(manifestPath, "utf8");
  } catch (error) {
    if (!isNodeError(error, "ENOENT")) {
      throw new Error(`Could not read the Simulator Deep Linker integration manifest: ${errorMessage(error)}`);
    }

    const defaultStoragePath = path.join(applicationSupport, "deeplinks.json");
    try {
      await assertAccessibleFile(defaultStoragePath, "Default storage");
      return {
        storagePath: defaultStoragePath,
        environmentsPath: path.join(applicationSupport, "environments.json"),
      };
    } catch (defaultStorageError) {
      throw new Error(
        `Install and open Simulator Deep Linker once to configure automatic storage, or select a Storage Override. ${errorMessage(defaultStorageError)}`,
      );
    }
  }

  const manifest = decodeIntegrationManifest(manifestSource);
  await assertAccessibleFile(manifest.storagePath, "Active storage");
  return {
    storagePath: manifest.storagePath,
    environmentsPath: manifest.environmentsPath || path.join(path.dirname(manifest.storagePath), "environments.json"),
  };
}

export async function readDeepLinks(storagePath: string): Promise<DeepLink[]> {
  return decodeDeepLinks(await readFile(storagePath, "utf8"));
}

export function decodeDeepLinks(source: string): DeepLink[] {
  const parsed: unknown = JSON.parse(source);
  if (!Array.isArray(parsed)) {
    throw new Error("The selected storage file does not contain a deep link list.");
  }

  const seenIDs = new Set<string>();
  return parsed.map((value, index) => {
    if (!isRecord(value)) throw invalidDeepLink(index);
    const { id, title, urlString, group, tags, isFavorite, createdAt, updatedAt } = value;
    const normalizedID = typeof id === "string" ? id.toLowerCase() : "";
    if (
      !isUUID(id) ||
      seenIDs.has(normalizedID) ||
      typeof title !== "string" ||
      typeof urlString !== "string" ||
      !urlString.trim() ||
      (group !== undefined && typeof group !== "string") ||
      (tags !== undefined && (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string"))) ||
      (isFavorite !== undefined && typeof isFavorite !== "boolean") ||
      !isISO8601Date(createdAt) ||
      !isISO8601Date(updatedAt)
    ) {
      throw invalidDeepLink(index);
    }

    seenIDs.add(normalizedID);
    return {
      ...value,
      id,
      title,
      urlString,
      group: group ?? "",
      tags: tags ?? [],
      isFavorite: isFavorite ?? false,
      createdAt,
      updatedAt,
    } as DeepLink;
  });
}

export async function addDeepLink(configuration: StorageConfiguration, values: NewDeepLink): Promise<DeepLink> {
  return withStorageLock(configuration.storagePath, async (storagePath) => {
    const links = await readDeepLinks(storagePath);
    const timestamp = iso8601WithoutFractionalSeconds(new Date());
    const deepLink: DeepLink = {
      createdAt: timestamp,
      group: values.group,
      id: randomUUID(),
      isFavorite: values.isFavorite,
      tags: values.tags,
      title: values.title,
      updatedAt: timestamp,
      urlString: values.urlString,
    };

    await writeDeepLinksAtomically(storagePath, [deepLink, ...links]);
    return deepLink;
  });
}

export async function deleteDeepLink(configuration: StorageConfiguration, id: string): Promise<DeepLink[]> {
  return withStorageLock(configuration.storagePath, async (storagePath) => {
    const links = await readDeepLinks(storagePath);
    const remainingLinks = links.filter((link) => link.id !== id);
    if (remainingLinks.length === links.length) {
      throw new Error("The deep link no longer exists in storage.");
    }
    await writeDeepLinksAtomically(storagePath, remainingLinks);
    return remainingLinks;
  });
}

const storageLockRetryMilliseconds = 25;
const storageLockTimeoutMilliseconds = 10_000;
const storageRecoveryClaimName = ".recovery-claim";

type StorageLockOptions = {
  retryMilliseconds?: number;
  timeoutMilliseconds?: number;
};

type StorageLockOwner = {
  schemaVersion: 1;
  token: string;
  pid: number;
};

type StorageRecoveryClaim = {
  schemaVersion: 1;
  ownerToken: string;
  ownerPid: number;
  claimantToken: string;
  claimantPid: number;
};

type StorageRecoveryLease = {
  claim: StorageRecoveryClaim;
  claimPath: string;
  canReleaseSafely: boolean;
};

export async function withStorageLock<T>(
  storagePath: string,
  operation: (storagePath: string) => Promise<T>,
  options: StorageLockOptions = {},
): Promise<T> {
  const destinationPath = await realpath(storagePath);
  const lockPath = `${destinationPath}.simulator-deep-linker.lock`;
  const ownerPath = path.join(lockPath, "owner");
  const owner: StorageLockOwner = { schemaVersion: 1, token: randomUUID(), pid: process.pid };
  const candidatePath = `${lockPath}.candidate.${owner.token}`;
  const candidateOwnerPath = path.join(candidatePath, "owner");
  const retryMilliseconds = options.retryMilliseconds ?? storageLockRetryMilliseconds;
  const timeoutMilliseconds = options.timeoutMilliseconds ?? storageLockTimeoutMilliseconds;
  const deadline = Date.now() + timeoutMilliseconds;

  while (true) {
    await mkdir(candidatePath);
    try {
      await writeFile(candidateOwnerPath, `${JSON.stringify(owner)}\n`, { encoding: "utf8", flag: "wx" });
    } catch (error) {
      await unlink(candidateOwnerPath).catch(() => undefined);
      await rmdir(candidatePath).catch(() => undefined);
      throw error;
    }

    try {
      // Publishing an initialized directory through a symlink is create-if-absent; unlike rename, it cannot replace an
      // existing empty lock directory while another writer is releasing or recovering it.
      await symlink(candidatePath, lockPath, "dir");
      break;
    } catch (error) {
      await unlink(candidateOwnerPath).catch(() => undefined);
      await rmdir(candidatePath).catch(() => undefined);
      if (!isNodeError(error, "EEXIST")) throw error;
      await recoverAbandonedStorageLock(lockPath, ownerPath);
      if (Date.now() >= deadline) {
        throw new Error(
          "Timed out waiting for another Simulator Deep Linker writer to finish. If no writer is running, remove the abandoned storage lock manually.",
        );
      }
      await delay(retryMilliseconds);
    }
  }

  let operationResult: T | undefined;
  let operationError: unknown;
  let operationFailed = false;
  try {
    operationResult = await operation(destinationPath);
  } catch (error) {
    operationFailed = true;
    operationError = error;
  }

  try {
    await releaseStorageLock(lockPath, ownerPath, owner);
  } catch (releaseError) {
    if (!operationFailed) throw releaseError;
  }

  if (operationFailed) throw operationError;
  return operationResult as T;
}

async function releaseStorageLock(lockPath: string, ownerPath: string, owner: StorageLockOwner): Promise<void> {
  const currentOwner = await readStorageLockOwner(ownerPath).catch(() => undefined);
  if (!currentOwner || currentOwner.token !== owner.token || currentOwner.pid !== owner.pid) {
    throw new Error("Storage lock ownership changed while updating deep links; the replacement lock was left intact.");
  }

  const releasePath = `${lockPath}.release.${owner.token}`;
  try {
    await rename(lockPath, releasePath);
  } catch (error) {
    throw new Error(`Could not verify storage lock ownership: ${errorMessage(error)}`);
  }

  const claimedOwnerPath = path.join(releasePath, "owner");
  const claimedOwner = await readStorageLockOwner(claimedOwnerPath).catch(() => undefined);
  if (!claimedOwner || claimedOwner.token !== owner.token || claimedOwner.pid !== owner.pid) {
    throw new Error("Storage lock ownership changed while updating deep links; the replacement lock was left intact.");
  }

  await removeClaimedStorageLock(releasePath, claimedOwnerPath);
}

async function recoverAbandonedStorageLock(lockPath: string, ownerPath: string): Promise<void> {
  let observedOwner: StorageLockOwner | undefined;
  try {
    observedOwner = await readStorageLockOwner(ownerPath);
  } catch (error) {
    if (!isNodeError(error, "ENOENT")) return;
  }

  if (!observedOwner) {
    await recoverLegacyTransitionLock(lockPath);
    return;
  }
  if (isProcessAlive(observedOwner.pid)) return;

  // The generation-local claim serializes recovery and keeps a stale observer from moving a replacement writer's lock.
  const recoveryLease = await acquireStorageRecoveryClaim(lockPath, observedOwner);
  if (!recoveryLease) return;

  const verifiedOwner = await readStorageLockOwner(ownerPath).catch(() => undefined);
  const verifiedClaim = await readStorageRecoveryClaim(recoveryLease.claimPath).catch(() => undefined);
  if (
    !verifiedOwner ||
    verifiedOwner.token !== observedOwner.token ||
    verifiedOwner.pid !== observedOwner.pid ||
    !sameStorageRecoveryClaim(verifiedClaim, recoveryLease.claim)
  ) {
    await releaseStorageRecoveryClaim(recoveryLease);
    return;
  }

  const recoveryPath = `${lockPath}.recovery.${randomUUID()}`;
  try {
    await rename(lockPath, recoveryPath);
  } catch (error) {
    await releaseStorageRecoveryClaim(recoveryLease);
    if (!isNodeError(error, "ENOENT")) throw error;
    return;
  }

  const claimedOwnerPath = path.join(recoveryPath, "owner");
  const claimedOwner = await readStorageLockOwner(claimedOwnerPath).catch(() => undefined);
  if (!claimedOwner || claimedOwner.token !== observedOwner.token || claimedOwner.pid !== observedOwner.pid) {
    return;
  }

  await removeClaimedStorageLock(recoveryPath, claimedOwnerPath);
}

async function recoverLegacyTransitionLock(lockPath: string): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(lockPath);
  } catch (error) {
    if (!isNodeError(error, "ENOENT")) throw error;
    return;
  }

  if (entries.length === 0) {
    throw new Error(
      "Simulator Deep Linker found an unfinished storage update from an older version. Quit Simulator Deep Linker and Raycast, remove the .simulator-deep-linker.lock folder next to your storage file, then try again.",
    );
  }

  const transitionNames = entries.filter((entry) => entry.startsWith(".recovery.") || entry.startsWith(".release."));
  if (transitionNames.length !== 1 || entries.length !== 1) return;

  const transitionPath = path.join(lockPath, transitionNames[0]);
  const transitionOwner = await readStorageLockOwner(transitionPath).catch(() => undefined);
  if (!transitionOwner || isProcessAlive(transitionOwner.pid)) return;

  const recoveryLease = await acquireStorageRecoveryClaim(lockPath, transitionOwner);
  if (!recoveryLease) return;

  const verifiedTransitionOwner = await readStorageLockOwner(transitionPath).catch(() => undefined);
  const verifiedClaim = await readStorageRecoveryClaim(recoveryLease.claimPath).catch(() => undefined);
  if (
    !verifiedTransitionOwner ||
    verifiedTransitionOwner.token !== transitionOwner.token ||
    verifiedTransitionOwner.pid !== transitionOwner.pid ||
    !sameStorageRecoveryClaim(verifiedClaim, recoveryLease.claim)
  ) {
    await releaseStorageRecoveryClaim(recoveryLease);
    return;
  }

  const recoveryPath = `${lockPath}.recovery.${randomUUID()}`;
  try {
    await rename(lockPath, recoveryPath);
  } catch (error) {
    await releaseStorageRecoveryClaim(recoveryLease);
    if (!isNodeError(error, "ENOENT")) throw error;
    return;
  }

  const claimedTransitionPath = path.join(recoveryPath, transitionNames[0]);
  const claimedOwner = await readStorageLockOwner(claimedTransitionPath).catch(() => undefined);
  if (!claimedOwner || claimedOwner.token !== transitionOwner.token || claimedOwner.pid !== transitionOwner.pid) return;

  await removeClaimedStorageLock(recoveryPath, claimedTransitionPath);
}

async function acquireStorageRecoveryClaim(
  lockPath: string,
  owner: StorageLockOwner,
): Promise<StorageRecoveryLease | undefined> {
  const lockTargetPath = await realpath(lockPath).catch(() => undefined);
  if (!lockTargetPath) return undefined;
  const canReleaseSafely = await lstat(lockPath)
    .then((value) => value.isSymbolicLink())
    .catch(() => false);
  const claimPath = path.join(lockTargetPath, storageRecoveryClaimName);
  const claim: StorageRecoveryClaim = {
    schemaVersion: 1,
    ownerToken: owner.token,
    ownerPid: owner.pid,
    claimantToken: randomUUID(),
    claimantPid: process.pid,
  };

  try {
    await writeStorageRecoveryClaim(claimPath, claim);
    return { claim, claimPath, canReleaseSafely };
  } catch (error) {
    if (isNodeError(error, "ENOENT")) return undefined;
    if (!isNodeError(error, "EEXIST")) throw error;
  }

  const abandonedClaim = await readStorageRecoveryClaim(claimPath).catch(() => undefined);
  if (
    !abandonedClaim ||
    abandonedClaim.ownerToken !== owner.token ||
    abandonedClaim.ownerPid !== owner.pid ||
    isProcessAlive(abandonedClaim.claimantPid)
  ) {
    return undefined;
  }

  const takeoverPath = path.join(lockTargetPath, `${storageRecoveryClaimName}.takeover.${claim.claimantToken}`);
  try {
    await rename(claimPath, takeoverPath);
  } catch (error) {
    if (isNodeError(error, "ENOENT")) return undefined;
    throw error;
  }

  const claimedAbandonedClaim = await readStorageRecoveryClaim(takeoverPath).catch(() => undefined);
  if (!sameStorageRecoveryClaim(claimedAbandonedClaim, abandonedClaim)) return undefined;

  try {
    await writeStorageRecoveryClaim(claimPath, claim);
  } catch (error) {
    await unlink(takeoverPath).catch(() => undefined);
    if (isNodeError(error, "EEXIST") || isNodeError(error, "ENOENT")) return undefined;
    throw error;
  }
  await unlink(takeoverPath).catch(() => undefined);
  return { claim, claimPath, canReleaseSafely };
}

async function releaseStorageRecoveryClaim(lease: StorageRecoveryLease): Promise<void> {
  if (!lease.canReleaseSafely) return;
  const currentClaim = await readStorageRecoveryClaim(lease.claimPath).catch(() => undefined);
  if (sameStorageRecoveryClaim(currentClaim, lease.claim)) await unlink(lease.claimPath).catch(() => undefined);
}

async function writeStorageRecoveryClaim(claimPath: string, claim: StorageRecoveryClaim): Promise<void> {
  await writeFile(claimPath, `${JSON.stringify(claim)}\n`, { encoding: "utf8", flag: "wx" });
}

async function readStorageRecoveryClaim(claimPath: string): Promise<StorageRecoveryClaim | undefined> {
  const parsed: unknown = JSON.parse(await readFile(claimPath, "utf8"));
  if (
    !isRecord(parsed) ||
    parsed.schemaVersion !== 1 ||
    typeof parsed.ownerToken !== "string" ||
    !parsed.ownerToken ||
    !isPositivePID(parsed.ownerPid) ||
    typeof parsed.claimantToken !== "string" ||
    !parsed.claimantToken ||
    !isPositivePID(parsed.claimantPid)
  ) {
    return undefined;
  }
  return parsed as StorageRecoveryClaim;
}

function sameStorageRecoveryClaim(
  left: StorageRecoveryClaim | undefined,
  right: StorageRecoveryClaim | undefined,
): boolean {
  return Boolean(
    left &&
    right &&
    left.ownerToken === right.ownerToken &&
    left.ownerPid === right.ownerPid &&
    left.claimantToken === right.claimantToken &&
    left.claimantPid === right.claimantPid,
  );
}

async function removeClaimedStorageLock(claimedLockPath: string, claimedOwnerPath: string): Promise<void> {
  const lockTargetPath = await realpath(claimedLockPath);
  const isSymbolicLock = (await lstat(claimedLockPath)).isSymbolicLink();
  await unlink(claimedOwnerPath);
  await unlink(path.join(claimedLockPath, storageRecoveryClaimName)).catch((error) => {
    if (!isNodeError(error, "ENOENT")) throw error;
  });
  for (const entry of await readdir(claimedLockPath)) {
    if (entry.startsWith(`${storageRecoveryClaimName}.takeover.`)) await unlink(path.join(claimedLockPath, entry));
  }
  if (isSymbolicLock) {
    await rmdir(lockTargetPath);
    await unlink(claimedLockPath);
  } else {
    await rmdir(claimedLockPath);
  }
}

async function readStorageLockOwner(ownerPath: string): Promise<StorageLockOwner | undefined> {
  const parsed: unknown = JSON.parse(await readFile(ownerPath, "utf8"));
  if (
    !isRecord(parsed) ||
    parsed.schemaVersion !== 1 ||
    typeof parsed.token !== "string" ||
    !parsed.token ||
    !isPositivePID(parsed.pid)
  ) {
    return undefined;
  }
  return parsed as StorageLockOwner;
}

function isPositivePID(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (isNodeError(error, "ESRCH")) return false;
    return true;
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function writeDeepLinksAtomically(storagePath: string, links: DeepLink[]): Promise<void> {
  const destinationPath = await realpath(storagePath);
  const temporaryPath = path.join(
    path.dirname(destinationPath),
    `.${path.basename(destinationPath)}.${randomUUID()}.tmp`,
  );
  const mode = (await stat(destinationPath)).mode & 0o777;

  try {
    await writeFile(temporaryPath, `${JSON.stringify(links, null, 2)}\n`, { encoding: "utf8", mode });
    await rename(temporaryPath, destinationPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

function iso8601WithoutFractionalSeconds(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function decodeIntegrationManifest(source: string): IntegrationManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    throw new Error(`The Simulator Deep Linker integration manifest contains invalid JSON: ${errorMessage(error)}`);
  }

  if (
    !isRecord(parsed) ||
    parsed.schemaVersion !== 1 ||
    typeof parsed.storagePath !== "string" ||
    !path.isAbsolute(parsed.storagePath) ||
    (parsed.environmentsPath !== undefined &&
      (typeof parsed.environmentsPath !== "string" || !path.isAbsolute(parsed.environmentsPath)))
  ) {
    throw new Error("Unsupported Simulator Deep Linker integration manifest.");
  }
  return parsed as IntegrationManifest;
}

async function assertAccessibleFile(filePath: string, label: string): Promise<void> {
  await access(filePath);
  const fileStats = await stat(filePath);
  if (!fileStats.isFile()) throw new Error(`${label} is not a file: ${filePath}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUUID(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isISO8601Date(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.valueOf()) && iso8601WithoutFractionalSeconds(date) === value;
}

function invalidDeepLink(index: number): Error {
  return new Error(`Deep link at index ${index} has an invalid or duplicate field.`);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isNodeError(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === code;
}
