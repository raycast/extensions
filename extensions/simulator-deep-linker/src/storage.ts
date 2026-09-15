import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, realpath, rename, rmdir, stat, unlink, writeFile } from "node:fs/promises";
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

type StorageLockOptions = {
  retryMilliseconds?: number;
  timeoutMilliseconds?: number;
};

export async function withStorageLock<T>(
  storagePath: string,
  operation: (storagePath: string) => Promise<T>,
  options: StorageLockOptions = {},
): Promise<T> {
  const destinationPath = await realpath(storagePath);
  const lockPath = `${destinationPath}.simulator-deep-linker.lock`;
  const ownerPath = path.join(lockPath, "owner");
  const ownerToken = randomUUID();
  const retryMilliseconds = options.retryMilliseconds ?? storageLockRetryMilliseconds;
  const timeoutMilliseconds = options.timeoutMilliseconds ?? storageLockTimeoutMilliseconds;
  const deadline = Date.now() + timeoutMilliseconds;

  while (true) {
    try {
      await mkdir(lockPath);
      try {
        await writeFile(ownerPath, `${ownerToken}\n`, { encoding: "utf8", flag: "wx" });
      } catch (error) {
        await unlink(ownerPath).catch(() => undefined);
        await rmdir(lockPath).catch(() => undefined);
        throw error;
      }
      break;
    } catch (error) {
      if (!isNodeError(error, "EEXIST")) throw error;
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
    await releaseStorageLock(lockPath, ownerPath, ownerToken);
  } catch (releaseError) {
    if (!operationFailed) throw releaseError;
  }

  if (operationFailed) throw operationError;
  return operationResult as T;
}

async function releaseStorageLock(lockPath: string, ownerPath: string, ownerToken: string): Promise<void> {
  let currentOwner: string;
  try {
    currentOwner = (await readFile(ownerPath, "utf8")).trim();
  } catch (error) {
    throw new Error(`Could not verify storage lock ownership: ${errorMessage(error)}`);
  }

  if (currentOwner !== ownerToken) {
    throw new Error("Storage lock ownership changed while updating deep links; the replacement lock was left intact.");
  }

  await unlink(ownerPath);
  await rmdir(lockPath);
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
