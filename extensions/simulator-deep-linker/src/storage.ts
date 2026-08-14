import { randomUUID } from "node:crypto";
import { access, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

type IntegrationManifest = {
  schemaVersion: number;
  storagePath: string;
  environmentsPath: string;
};

export type StorageConfiguration = {
  storagePath: string;
  environmentsPath: string;
};

export type DeepLink = {
  id: string;
  title: string;
  urlString: string;
  group?: string;
  tags?: string[];
  isFavorite?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type NewDeepLink = {
  title: string;
  urlString: string;
  group: string;
  tags: string[];
  isFavorite: boolean;
};

export async function resolveStorageConfiguration(storageOverride?: string): Promise<StorageConfiguration> {
  if (storageOverride) {
    await access(storageOverride);
    return {
      storagePath: storageOverride,
      environmentsPath: path.join(path.dirname(storageOverride), "environments.json"),
    };
  }

  const applicationSupport = path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "com.stefan.SimulatorDeepLinker",
  );
  const manifestPath = path.join(applicationSupport, "integration.json");

  try {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as IntegrationManifest;
    if (manifest.schemaVersion !== 1 || !manifest.storagePath) {
      throw new Error("Unsupported SimulatorDeepLinker integration manifest.");
    }
    await access(manifest.storagePath);
    return {
      storagePath: manifest.storagePath,
      environmentsPath: manifest.environmentsPath || path.join(path.dirname(manifest.storagePath), "environments.json"),
    };
  } catch (manifestError) {
    const defaultStoragePath = path.join(applicationSupport, "deeplinks.json");
    try {
      await access(defaultStoragePath);
      return {
        storagePath: defaultStoragePath,
        environmentsPath: path.join(applicationSupport, "environments.json"),
      };
    } catch {
      const reason = manifestError instanceof Error ? manifestError.message : String(manifestError);
      throw new Error(
        `Open SimulatorDeepLinker once to configure automatic storage, or select a Storage Override. ${reason}`,
      );
    }
  }
}

export async function readDeepLinks(storagePath: string): Promise<DeepLink[]> {
  const parsed: unknown = JSON.parse(await readFile(storagePath, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error("The selected storage file does not contain a deep link list.");
  }
  return parsed as DeepLink[];
}

export async function addDeepLink(configuration: StorageConfiguration, values: NewDeepLink): Promise<DeepLink> {
  const links = await readDeepLinks(configuration.storagePath);
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

  await writeDeepLinksAtomically(configuration.storagePath, [deepLink, ...links]);
  return deepLink;
}

export async function deleteDeepLink(configuration: StorageConfiguration, id: string): Promise<void> {
  const links = await readDeepLinks(configuration.storagePath);
  const remainingLinks = links.filter((link) => link.id !== id);
  if (remainingLinks.length === links.length) {
    throw new Error("The deep link no longer exists in storage.");
  }
  await writeDeepLinksAtomically(configuration.storagePath, remainingLinks);
}

async function writeDeepLinksAtomically(storagePath: string, links: DeepLink[]): Promise<void> {
  const temporaryPath = path.join(path.dirname(storagePath), `.${path.basename(storagePath)}.${randomUUID()}.tmp`);
  const mode = (await stat(storagePath)).mode & 0o777;

  try {
    await writeFile(temporaryPath, `${JSON.stringify(links, null, 2)}\n`, { encoding: "utf8", mode });
    await rename(temporaryPath, storagePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

function iso8601WithoutFractionalSeconds(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}
