import * as openpgp from "openpgp";
import type { ApiResource, Resource } from "../types";

export interface SharedMetadataKey {
  id: string;
  fingerprint: string;
  metadata_private_keys?: {
    user_id: string | null;
    metadata_key_id?: string;
    data: string;
  }[];
}

interface SharedMetadataKeys {
  userId: string;
  keys: SharedMetadataKey[];
}

class MetadataError extends Error {}

function readObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new MetadataError("Invalid metadata object");
  }
  return value as Record<string, unknown>;
}

function readJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") throw new MetadataError("Invalid decrypted metadata format");
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new MetadataError("Decrypted metadata is not valid JSON");
  }
  return readObject(parsed);
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export class MetadataDecryptor {
  private userKey?: Promise<openpgp.PrivateKey>;
  private sharedKeys?: Promise<SharedMetadataKeys>;
  private decryptedKeys = new Map<string, Promise<openpgp.PrivateKey>>();

  constructor(
    private baseUrl: string,
    private loadUserKey: () => Promise<openpgp.PrivateKey>,
    private loadSharedKeys: () => Promise<SharedMetadataKeys>,
  ) {}

  public async decryptResources(resources: ApiResource[]): Promise<Resource[]> {
    const result: Resource[] = [];
    // Bound concurrent crypto work for large vaults; cache keys only in this client's memory.
    for (let start = 0; start < resources.length; start += 10) {
      const batch = await Promise.all(
        resources.slice(start, start + 10).map((resource) => this.decryptResource(resource)),
      );
      result.push(...batch);
    }
    return result;
  }

  private async decryptResource(resource: ApiResource): Promise<Resource> {
    const normalized: Resource = {
      ...resource,
      name: text(resource.name),
      username: text(resource.username),
      uri: text(resource.uri),
      description: text(resource.description),
    };
    if (resource.metadata == null && !resource.metadata_key_type) return normalized;

    try {
      if (typeof resource.metadata !== "string" || !resource.metadata) {
        throw new MetadataError("Encrypted metadata is missing");
      }

      let key: openpgp.PrivateKey;
      if (resource.metadata_key_type === "user_key") {
        key = await (this.userKey ??= this.loadUserKey());
      } else if (resource.metadata_key_type === "shared_key" && resource.metadata_key_id) {
        const id = resource.metadata_key_id;
        if (!this.decryptedKeys.has(id)) this.decryptedKeys.set(id, this.decryptSharedKey(id));
        key = await this.decryptedKeys.get(id)!;
      } else {
        throw new MetadataError("Metadata key type or identifier is missing or unsupported");
      }

      const message = await openpgp.readMessage({ armoredMessage: resource.metadata });
      const decrypted = await openpgp.decrypt({ message, decryptionKeys: key, format: "utf8" });
      const metadata = readJsonObject(decrypted.data);
      if (metadata.object_type !== undefined && metadata.object_type !== "PASSBOLT_RESOURCE_METADATA") {
        throw new MetadataError("Unexpected metadata object type");
      }
      if (typeof metadata.resource_type_id !== "string" || metadata.resource_type_id !== resource.resource_type_id) {
        throw new MetadataError("Metadata resource type does not match the resource");
      }
      if (!text(metadata.name).trim()) throw new MetadataError("Decrypted metadata has no name");
      if (
        metadata.uris != null &&
        (!Array.isArray(metadata.uris) || metadata.uris.some((uri) => typeof uri !== "string"))
      ) {
        throw new MetadataError("Invalid metadata URIs");
      }
      const uris = (metadata.uris as string[] | null | undefined) ?? (text(metadata.uri) ? [text(metadata.uri)] : []);

      return {
        ...normalized,
        name: text(metadata.name),
        username: text(metadata.username),
        uri: uris[0] ?? "",
        uris,
        description: text(metadata.description),
      };
    } catch (error) {
      // Never include encrypted payloads or decrypted private data in errors or logs.
      return {
        ...normalized,
        name: "Unable to decrypt resource",
        metadata_error:
          error instanceof MetadataError
            ? error.message
            : "Metadata decryption failed. Check that this item opens in the Passbolt web app.",
      };
    }
  }

  private async decryptSharedKey(id: string): Promise<openpgp.PrivateKey> {
    const userKey = await (this.userKey ??= this.loadUserKey());
    const { userId, keys } = await (this.sharedKeys ??= this.loadSharedKeys());
    const sharedKey = keys.find((key) => key.id === id);
    const envelope = sharedKey?.metadata_private_keys?.find(
      (key) => key.user_id === userId && (!key.metadata_key_id || key.metadata_key_id === id),
    );
    if (!sharedKey || !envelope) throw new MetadataError("The metadata key has not been shared with your account");

    const message = await openpgp.readMessage({ armoredMessage: envelope.data });
    let data: Record<string, unknown>;
    try {
      const decrypted = await openpgp.decrypt({
        message,
        decryptionKeys: userKey,
        verificationKeys: userKey.toPublic(),
        expectSigned: true,
        format: "utf8",
      });
      data = readJsonObject(decrypted.data);
    } catch {
      throw new MetadataError("Cannot verify your shared metadata key. Open the vault in Passbolt to trust the key.");
    }
    if (data.object_type !== "PASSBOLT_METADATA_PRIVATE_KEY")
      throw new MetadataError("Unexpected metadata key object type");
    if (text(data.domain).replace(/\/$/, "") !== this.baseUrl.replace(/\/$/, "")) {
      throw new MetadataError("The metadata key belongs to a different Passbolt instance");
    }
    let key = await openpgp.readPrivateKey({ armoredKey: text(data.armored_key) });
    const fingerprint = key.getFingerprint().toLowerCase();
    if (fingerprint !== text(data.fingerprint).toLowerCase() || fingerprint !== sharedKey.fingerprint.toLowerCase()) {
      throw new MetadataError("Metadata key fingerprints do not match");
    }
    if (!key.isDecrypted()) key = await openpgp.decryptKey({ privateKey: key, passphrase: text(data.passphrase) });
    return key;
  }
}
