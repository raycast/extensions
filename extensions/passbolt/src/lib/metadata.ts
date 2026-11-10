import * as openpgp from "openpgp";
import type { ApiResource, Resource, ResourceLoadProgress } from "../types";

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

// Minimum interval between progressive decryption snapshots for callers that render them.
const PROGRESS_SNAPSHOT_INTERVAL_MS = 150;

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

  public clearSharedKeys(): void {
    this.sharedKeys = undefined;
    this.decryptedKeys.clear();
  }

  private getUserKey(): Promise<openpgp.PrivateKey> {
    if (!this.userKey) {
      const pending = this.loadUserKey().catch((error) => {
        if (this.userKey === pending) this.userKey = undefined;
        throw error;
      });
      this.userKey = pending;
    }
    return this.userKey;
  }

  private getSharedKeys(): Promise<SharedMetadataKeys> {
    // Keep failures for this load so later batches do not repeat a failing HTTP request.
    // clearSharedKeys() allows the next account/resource load to retry.
    return (this.sharedKeys ??= this.loadSharedKeys());
  }

  private getDecryptedSharedKey(id: string): Promise<openpgp.PrivateKey> {
    let pending = this.decryptedKeys.get(id);
    if (!pending) {
      pending = this.decryptSharedKey(id).catch((error) => {
        if (this.decryptedKeys.get(id) === pending) this.decryptedKeys.delete(id);
        throw error;
      });
      this.decryptedKeys.set(id, pending);
    }
    return pending;
  }

  public async decryptResources(
    resources: ApiResource[],
    options: { onProgress?: (progress: ResourceLoadProgress) => void; signal?: AbortSignal } = {},
  ): Promise<Resource[]> {
    const { onProgress, signal } = options;
    // A fixed-size worker pool keeps concurrent crypto work bounded for large vaults while
    // removing the barrier between batches: a slow entry no longer stalls the ones behind it.
    // Workers pull indices in order and write into a pre-sized array, so output order always
    // matches input order. Key caching stays exactly as before (memory of this client only).
    const results: Resource[] = new Array<Resource>(resources.length);
    let nextIndex = 0;
    let processed = 0;
    let lastSnapshot = 0;
    let trailingSnapshot: ReturnType<typeof setTimeout> | undefined;
    // Snapshots scan the results array, so building one per completion would be quadratic.
    // Throttle them, while always sending an early partial update and a final complete one.
    // A throttled completion schedules one trailing update instead of being dropped, so
    // ready entries are never left hidden behind a slow entry; the timer is cleared when
    // the load finishes or is cancelled.
    const snapshot = (force: boolean) => {
      if (!onProgress) return;
      const now = Date.now();
      const wait = PROGRESS_SNAPSHOT_INTERVAL_MS - (now - lastSnapshot);
      if (!force && wait > 0) {
        trailingSnapshot ??= setTimeout(() => {
          trailingSnapshot = undefined;
          snapshot(true);
        }, wait);
        return;
      }
      if (trailingSnapshot) {
        clearTimeout(trailingSnapshot);
        trailingSnapshot = undefined;
      }
      lastSnapshot = now;
      onProgress({
        processed,
        candidates: resources.length,
        items: results.filter((item): item is Resource => item !== undefined),
      });
    };
    const worker = async () => {
      while (nextIndex < resources.length) {
        signal?.throwIfAborted();
        const index = nextIndex++;
        results[index] = await this.decryptResource(resources[index], signal);
        signal?.throwIfAborted();
        processed++;
        snapshot(processed === 1 || processed === resources.length);
      }
    };
    try {
      await Promise.all(Array.from({ length: Math.min(resources.length, 16) }, worker));
      signal?.throwIfAborted();
      return results;
    } finally {
      // Never leave a throttled trailing update behind after completion or cancellation.
      if (trailingSnapshot) clearTimeout(trailingSnapshot);
    }
  }

  public async decryptResource(resource: ApiResource, signal?: AbortSignal): Promise<Resource> {
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
        key = await this.getUserKey();
      } else if (resource.metadata_key_type === "shared_key" && resource.metadata_key_id) {
        key = await this.getDecryptedSharedKey(resource.metadata_key_id);
      } else {
        throw new MetadataError("Metadata key type or identifier is missing or unsupported");
      }

      // Stop before starting new crypto when the load was cancelled while this entry
      // waited for its key. Crypto that already started is allowed to finish.
      signal?.throwIfAborted();

      const message = await openpgp.readMessage({ armoredMessage: resource.metadata });
      const decrypted = await openpgp.decrypt({ message, decryptionKeys: key, format: "utf8" });
      const metadata = readJsonObject(decrypted.data);
      if (metadata.object_type !== undefined && metadata.object_type !== "PASSBOLT_RESOURCE_METADATA") {
        throw new MetadataError("Unexpected metadata object type");
      }
      // The metadata also carries a resource_type_id, but the clear-text row is the id the API
      // and the rest of the client use. Passbolt only advises writers to keep the pair in sync,
      // and its own migration bug (API PB-39512) left legitimate vaults where the two differ.
      // The decrypted metadata is the trusted side — the clear-text id is server-controlled — so
      // a stale or missing id here must not hide an entry the Passbolt app opens normally.
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
      // Cancellation is not an entry failure: let it stop the whole load instead of
      // reporting closed-command entries as undecryptable.
      if (signal?.aborted) throw error;
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
    const userKey = await this.getUserKey();
    const { userId, keys } = await this.getSharedKeys();
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
