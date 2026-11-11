import { getPreferenceValues } from "@raycast/api";
import * as openpgp from "openpgp";
import * as fs from "fs/promises";
import { TOTP } from "otpauth";
import { MetadataDecryptor, SharedMetadataKey } from "./metadata";
import {
  ApiResource,
  ResourceLoadProgress,
  ResourceType,
  Secret,
  TotpConfiguration,
  TotpLoadProgress,
  TotpResource,
} from "../types";
import { filterResources } from "../utils/resources";
import { parseTotpConfiguration, resourceTypeSupportsTotp } from "../utils/totp";

// Secrets load in ID-filtered batches after the metadata-only list, so a vault's
// non-TOTP secrets are never downloaded. The first batch is small: the entries the
// Authenticator shows first get their codes before the rest of the vault streams in.
const FIRST_SECRET_BATCH_SIZE = 8;
const SECRET_BATCH_SIZE = 40;
// Per-entry secret and metadata work runs through a fixed-size worker pool.
const TOTP_WORKER_COUNT = 8;
// Minimum interval between progressive load snapshots for callers that render them.
const PROGRESS_SNAPSHOT_INTERVAL_MS = 150;

interface PassboltResponse<T = unknown> {
  header: {
    id: string;
    status: string;
    servertime: number;
    action: string;
    message: string;
    url: string;
    code: number;
  };
  body: T;
}

interface MFAProvider {
  mfa_providers?: string[];
}

// Match bulk rows by ID, never by response order, and reject secrets whose explicit
// resource_id disagrees with their row. Older responses may omit resource_id.
function ownSecret(resourceId: string, secret?: Secret | null): Secret | undefined {
  if (!secret?.data) return undefined;
  return secret.resource_id && secret.resource_id !== resourceId ? undefined : secret;
}

function rowSecret(resource: ApiResource): Secret | undefined {
  for (const candidate of [...(resource.secrets ?? []), resource.secret]) {
    const secret = ownSecret(resource.id, candidate);
    if (secret) return secret;
  }
  return undefined;
}

export class PassboltClient {
  private baseUrl: string;
  private privateKeyPath: string;
  private passphrase: string;
  private totpSecret: string | undefined;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private sessionCookie: string | null = null;
  private csrfToken: string | null = null;
  private isAuthenticated: boolean = false;
  private metadataDecryptor: MetadataDecryptor;
  private privateKey?: Promise<openpgp.PrivateKey>;
  private authAttempt?: Promise<void>;
  private resourceTypes?: Promise<ResourceType[]>;

  constructor() {
    const prefs = getPreferenceValues<Preferences>();
    this.baseUrl = prefs.passboltUrl.replace(/\/$/, "");
    this.privateKeyPath = prefs.privateKey;
    this.passphrase = prefs.passphrase;
    this.totpSecret = prefs.totpSecret;
    this.metadataDecryptor = new MetadataDecryptor(
      this.baseUrl,
      () => this.getPrivateKey(),
      async () => {
        const [userResponse, keysResponse] = await Promise.all([
          this.request("/users/me.json"),
          this.request("/metadata/keys.json?contain[metadata_private_keys]=1"),
        ]);
        if (!userResponse.ok || !keysResponse.ok) throw new Error("Unable to load shared metadata keys");
        const user = (await userResponse.json()) as PassboltResponse<{ id: string }>;
        const keys = (await keysResponse.json()) as PassboltResponse<SharedMetadataKey[]>;
        if (typeof user.body?.id !== "string" || !Array.isArray(keys.body)) {
          throw new Error("Invalid shared metadata key response");
        }
        return { userId: user.body.id, keys: keys.body };
      },
    );
  }

  private async getPrivateKey(): Promise<openpgp.PrivateKey> {
    if (!this.privateKey) {
      this.privateKey = this.readPrivateKey().catch((error) => {
        this.privateKey = undefined;
        throw error;
      });
    }
    return this.privateKey;
  }

  private async readPrivateKey(): Promise<openpgp.PrivateKey> {
    try {
      const keyContent = await fs.readFile(this.privateKeyPath, "utf8");

      let privateKey = await openpgp.readPrivateKey({ armoredKey: keyContent });

      if (!privateKey.isDecrypted()) {
        try {
          privateKey = await openpgp.decryptKey({
            privateKey,
            passphrase: this.passphrase,
          });
        } catch {
          throw new Error("Invalid passphrase or corrupted key.");
        }
      }

      return privateKey;
    } catch (error) {
      if ((error as Error & { code?: string }).code === "ENOENT") {
        throw new Error(`Private key file not found at ${this.privateKeyPath}`);
      }
      throw error;
    }
  }

  private generateTOTP(): string {
    if (!this.totpSecret) {
      throw new Error("TOTP secret not configured");
    }

    const totp = new TOTP({
      secret: this.totpSecret,
      digits: 6,
      period: 30,
    });

    return totp.generate();
  }

  private async request(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    // Add session cookie if we have one (for GPGAuth session)
    if (this.sessionCookie) {
      headers["Cookie"] = this.sessionCookie;
    }

    const response = await fetch(url, { ...options, headers });

    // Handle set-cookie for session management
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      // Parse new cookies
      const newCookies: Record<string, string> = {};
      setCookie.split(",").forEach((cookieStr) => {
        const cookiePart = cookieStr.trim().split(";")[0];
        const [name, value] = cookiePart.split("=");
        if (name && value) {
          newCookies[name.trim()] = value.trim();
        }
      });

      // Merge with existing cookies
      const existingCookies: Record<string, string> = {};
      if (this.sessionCookie) {
        this.sessionCookie.split("; ").forEach((cookie) => {
          const [name, value] = cookie.split("=");
          if (name && value) {
            existingCookies[name] = value;
          }
        });
      }

      // Merge new cookies into existing
      Object.assign(existingCookies, newCookies);

      // Rebuild cookie string
      this.sessionCookie = Object.entries(existingCookies)
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");

      // Extract CSRF token if present
      if (newCookies.csrfToken) {
        this.csrfToken = newCookies.csrfToken;
      }
    }

    if (!response.ok && response.status !== 403) {
      // The response body is deliberately not logged: it can echo request content.
      await response.body?.cancel().catch(() => {});
      console.error(`Passbolt API error ${response.status} for ${new URL(url).pathname}`);
      throw new Error(`Passbolt API Error: ${response.status} ${response.statusText}`);
    }

    return response;
  }

  private generateChallenge(): string {
    // Generate UUID v4
    const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    return `gpgauthv1.3.0|36|${uuid}|gpgauthv1.3.0`;
  }

  private async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${this.baseUrl}/auth/jwt/refresh.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: this.refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh access token");
    }

    const json = (await response.json()) as PassboltResponse<{ access_token: string }>;
    this.accessToken = json.body.access_token;
  }

  public async authenticate(): Promise<void> {
    // Skip if already authenticated
    if (this.isAuthenticated) {
      return;
    }
    // Parallel resource/type loads share one GPGAuth login instead of racing two sessions.
    if (!this.authAttempt) {
      const pending = this.runAuthentication().catch((error: unknown) => {
        if (this.authAttempt === pending) this.authAttempt = undefined;
        throw error;
      });
      this.authAttempt = pending;
    }
    await this.authAttempt;
  }

  private async runAuthentication() {
    try {
      // Start unlocking the user private key early so it overlaps the server-key request.
      const userKeyPromise = this.getPrivateKey();
      // The failure is surfaced below; swallow it here so a failed request cannot leave it unhandled.
      userKeyPromise.catch(() => {});

      // 1. Get Server Public Key
      const verifyRes = await this.request("/auth/verify.json");
      const verifyJson = (await verifyRes.json()) as PassboltResponse<{ keydata: string }>;
      const serverKeyArmored = verifyJson.body.keydata;
      await openpgp.readKey({ armoredKey: serverKeyArmored });

      // 2. Get User Private Key
      const userPrivateKey = await userKeyPromise;
      const userFingerprint = userPrivateKey.getFingerprint();

      // 3. Stage 1 Login: Send Key ID
      const login1Res = await this.request("/auth/login.json", {
        method: "POST",
        body: JSON.stringify({
          data: {
            gpg_auth: {
              keyid: userFingerprint,
            },
          },
        }),
      });

      const nonceHeader = login1Res.headers.get("x-gpgauth-user-auth-token");
      if (!nonceHeader) {
        // Check if we're already authenticated
        const login1Json = (await login1Res.json()) as PassboltResponse;

        // If already authenticated, just return
        if (login1Json.header && login1Json.header.status === "success") {
          this.isAuthenticated = true;
          return;
        }

        throw new Error("Server did not return a nonce token.");
      }

      // 4. Decrypt Nonce
      let encryptedNonce = decodeURIComponent(nonceHeader);

      // Sanitize nonce
      encryptedNonce = encryptedNonce.replace(/-----BEGIN\\\+PGP\\\+MESSAGE-----/g, "-----BEGIN PGP MESSAGE-----");
      encryptedNonce = encryptedNonce.replace(/-----END\\\+PGP\\\+MESSAGE-----/g, "-----END PGP MESSAGE-----");
      encryptedNonce = encryptedNonce.replace(/\\\+/g, "+");

      const message = await openpgp.readMessage({ armoredMessage: encryptedNonce });
      const { data: decryptedNonce } = await openpgp.decrypt({
        message,
        decryptionKeys: [userPrivateKey],
      });

      // 5. Stage 2 Login: Send Decrypted Nonce in PLAINTEXT
      const login2Res = await this.request("/auth/login.json", {
        method: "POST",
        body: JSON.stringify({
          data: {
            gpg_auth: {
              keyid: userFingerprint,
              user_token_result: String(decryptedNonce), // Send PLAINTEXT nonce!
            },
          },
        }),
      });

      const login2Json = (await login2Res.json()) as PassboltResponse<MFAProvider>;

      // Check if MFA is required
      if (login2Json.body && login2Json.body.mfa_providers) {
        if (!this.totpSecret) {
          throw new Error(
            "MFA is required but no TOTP secret provided. Please add your TOTP secret in the extension preferences.",
          );
        }

        // Send TOTP for verification
        const mfaRes = await this.request("/mfa/verify/totp.json", {
          method: "POST",
          body: JSON.stringify({
            totp: this.generateTOTP(),
          }),
        });

        const mfaJson = await mfaRes.json();
        if ((mfaJson as PassboltResponse).header && (mfaJson as PassboltResponse).header.status === "error") {
          throw new Error(`MFA verification failed: ${(mfaJson as PassboltResponse).header.message}`);
        }
      } else if (login2Json.header && login2Json.header.status === "error") {
        throw new Error(`Authentication failed: ${login2Json.header.message}`);
      }

      this.isAuthenticated = true;
    } catch (error) {
      this.isAuthenticated = false;
      throw error;
    }
  }

  private async fetchResources(signal?: AbortSignal, includeSecrets = true, resourceIds?: string[]) {
    await this.authenticate();
    signal?.throwIfAborted();

    // Search decrypts names locally and only needs secrets on copy/detail, so it skips
    // contain[secret]; Authenticator secrets load in ID-filtered batches below. The ID
    // filter is the documented filter[has-id][] array (passbolt_api's
    // ResourcesIndexControllerTest exercises it with two IDs) and keeps secret
    // downloads limited to the entries that actually need one.
    const idFilter = (resourceIds ?? []).map((id) => `&filter[has-id][]=${encodeURIComponent(id)}`).join("");
    const resourcesPath = `/resources.json?${includeSecrets ? "contain[secret]=1&" : ""}contain[tags]=1&contain[favorite]=1${idFilter}`;
    let res = await this.request(resourcesPath, { signal });

    // Check if MFA is required (403 response)
    if (res.status === 403) {
      const errorJson = (await res.json()) as PassboltResponse<MFAProvider>;
      if (errorJson.body && errorJson.body.mfa_providers) {
        if (!this.totpSecret) {
          throw new Error(
            "MFA is required but no TOTP secret provided. Please add your TOTP secret in the extension preferences.",
          );
        }

        // Send TOTP for verification
        const mfaHeaders: Record<string, string> = {};
        if (this.csrfToken) {
          mfaHeaders["X-CSRF-Token"] = this.csrfToken;
        }
        const mfaRes = await this.request("/mfa/verify/totp.json", {
          method: "POST",
          headers: mfaHeaders,
          body: JSON.stringify({
            totp: this.generateTOTP(),
          }),
        });

        const mfaJson = await mfaRes.json();
        if ((mfaJson as PassboltResponse).header && (mfaJson as PassboltResponse).header.status === "error") {
          throw new Error(`MFA verification failed: ${(mfaJson as PassboltResponse).header.message}`);
        }

        // Retry the request after MFA verification
        res = await this.request(resourcesPath, { signal });
      }
    }

    if (!res.ok) throw new Error(`Unable to fetch resources (HTTP ${res.status})`);
    const json = (await res.json()) as PassboltResponse<ApiResource[]>;
    if (!Array.isArray(json.body)) throw new Error("Invalid resource response from Passbolt");
    return json;
  }

  // Secrets are fetched in ID-filtered batches: the first, small batch covers the
  // entries the Authenticator shows first, later batches amortize round trips, and
  // at most one batch request is in flight at a time. Entries that already carry
  // their secret skip the fetch; a missing or foreign secret falls back to that
  // entry's own request so one slow or broken entry cannot hide the others.
  private secretLoader(
    resources: ApiResource[],
    signal?: AbortSignal,
  ): (resource: ApiResource) => Promise<Secret | undefined> {
    const loaders = new Map<string, () => Promise<Secret | undefined>>();
    // This flag belongs to this load only: Refresh retries the bulk path. If the
    // server cannot provide any bulk secrets, avoid repeating a failed probe for
    // every batch while still allowing the bounded workers to try each entry.
    let useBatches = true;
    let previousBatch: Promise<unknown> = Promise.resolve();
    for (let start = 0, first = true; start < resources.length; first = false) {
      const batch = resources.slice(start, start + (first ? FIRST_SECRET_BATCH_SIZE : SECRET_BATCH_SIZE));
      start += batch.length;
      const missing = batch.filter((resource) => !rowSecret(resource));
      if (!missing.length) continue;
      let loaded: Promise<Map<string, Secret>> | undefined;
      const loadBatch = () => {
        if (!loaded) {
          loaded = previousBatch.then(async () => {
            signal?.throwIfAborted();
            if (useBatches) {
              try {
                const secrets = await this.fetchSecretsByIds(
                  missing.map((resource) => resource.id),
                  signal,
                );
                if (secrets.size) return secrets;
              } catch (error) {
                if (signal?.aborted) throw error;
              }
              useBatches = false;
            }
            return new Map<string, Secret>();
          });
          previousBatch = loaded;
        }
        return loaded;
      };
      for (const resource of missing) {
        // Start per-entry fallbacks only when a worker asks for the entry, rather
        // than eagerly starting up to 40 requests when the batch promise resolves.
        loaders.set(resource.id, async () => {
          const secrets = await loadBatch();
          signal?.throwIfAborted();
          const secret = secrets.get(resource.id);
          return secret ?? ownSecret(resource.id, await this.getSecret(resource.id, signal));
        });
      }
    }
    return (resource) => {
      const included = rowSecret(resource);
      if (included) return Promise.resolve(included);
      return loaders.get(resource.id)?.() ?? Promise.resolve(undefined);
    };
  }

  private async fetchSecretsByIds(resourceIds: string[], signal?: AbortSignal): Promise<Map<string, Secret>> {
    const json = await this.fetchResources(signal, true, resourceIds);
    const secrets = new Map<string, Secret>();
    const requestedIds = new Set(resourceIds);
    for (const resource of json.body) {
      // Match the response rows to entries by ID; server order is never trusted.
      if (!requestedIds.has(resource.id)) continue;
      const secret = rowSecret(resource);
      if (secret) secrets.set(resource.id, secret);
    }
    return secrets;
  }

  private async readTotpEntry(
    resource: ApiResource,
    secret: Promise<Secret | undefined>,
    supportsTotp: Map<string, boolean | undefined>,
    signal?: AbortSignal,
  ): Promise<{ totp?: TotpConfiguration; totp_error?: string } | undefined> {
    try {
      const encrypted = await secret;
      if (!encrypted?.data) throw new Error("Missing encrypted secret");
      const config = parseTotpConfiguration(await this.decryptSecretData(encrypted.data));
      if (!config) {
        if (supportsTotp.get(resource.resource_type_id ?? "") === true) throw new Error("Missing TOTP configuration");
        return undefined;
      }
      return { totp: config, totp_error: undefined };
    } catch (error) {
      // Cancellation is not an entry failure: let it stop the whole load instead of
      // turning aborted entries into error rows.
      if (signal?.aborted) throw error;
      return {
        totp: undefined,
        totp_error: "Unable to read this TOTP entry. Check that it opens in Passbolt.",
      };
    }
  }

  public async searchResources(
    query: string,
    options: { signal?: AbortSignal; onProgress?: (progress: ResourceLoadProgress) => void } = {},
  ) {
    const { signal, onProgress } = options;
    // v5 names are encrypted, so keyword filtering must happen locally after decryption.
    this.metadataDecryptor.clearSharedKeys();
    // Search never needs the encrypted secret payloads in the list response.
    const json = await this.fetchResources(signal, false);
    signal?.throwIfAborted();
    const resources = await this.metadataDecryptor.decryptResources(json.body, { onProgress, signal });
    signal?.throwIfAborted();
    return { ...json, body: filterResources(resources, query) };
  }

  public async getTotpResources(
    options: { signal?: AbortSignal; onProgress?: (progress: TotpLoadProgress) => void } = {},
  ): Promise<TotpLoadProgress> {
    const { signal, onProgress } = options;
    // Refresh Accounts reuses this client: reload current shares along with the resources.
    this.metadataDecryptor.clearSharedKeys();
    // The schema request is independent of the resource list: run both at once. A schema
    // request can lose the race against the MFA challenge that fetchResources resolves, so
    // on failure wait for the resource request to settle and retry once before giving up.
    // The list itself is metadata-only: secret payloads dominate large vault downloads
    // and only TOTP candidates ever need one, so secrets load in batches afterwards.
    const resourcesPromise = this.fetchResources(signal, false);
    const typesPromise = this.getResourceTypes().catch(async (error: unknown) => {
      const resourcesOk = await resourcesPromise.then(
        () => true,
        () => false,
      );
      signal?.throwIfAborted();
      if (!resourcesOk) throw error;
      return this.getResourceTypes();
    });
    const [response, types] = await Promise.all([resourcesPromise, typesPromise]);
    const supportsTotp = new Map(types.map((type) => [type.id, resourceTypeSupportsTotp(type)]));
    const candidates = response.body.filter((resource) => supportsTotp.get(resource.resource_type_id ?? "") !== false);
    const progress: TotpLoadProgress = {
      items: [],
      processed: 0,
      candidates: candidates.length,
      totalResources: response.body.length,
    };
    onProgress?.({ ...progress, items: [] });

    const secretFor = this.secretLoader(candidates, signal);
    const items = new Array<TotpResource | undefined>(candidates.length);
    let nextIndex = 0;
    let processed = 0;
    let shown = 0;
    let hasCode = false;
    let lastSnapshot = 0;
    let trailingSnapshot: ReturnType<typeof setTimeout> | undefined;
    // Snapshots copy the collected items, so one per completion would be quadratic:
    // throttle them while always sending an early partial update and the final one.
    // A throttled completion schedules one trailing update instead of being dropped,
    // so ready entries are never left hidden while the remaining workers wait on
    // slow requests. The timer is cleared when the load finishes or is cancelled.
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
        ...progress,
        processed,
        items: items.filter((item): item is TotpResource => item !== undefined),
      });
    };
    // Each entry resolves independently — a slow secret no longer stalls the entries
    // behind it — and metadata is decrypted only for entries that will be shown.
    const worker = async () => {
      while (nextIndex < candidates.length) {
        signal?.throwIfAborted();
        const index = nextIndex++;
        const resource = candidates[index];
        const entry = await this.readTotpEntry(resource, secretFor(resource), supportsTotp, signal);
        signal?.throwIfAborted();
        if (entry) {
          items[index] = { ...(await this.metadataDecryptor.decryptResource(resource, signal)), ...entry };
          signal?.throwIfAborted();
        }
        processed++;
        const firstItem = entry !== undefined && ++shown === 1;
        const firstCode = !hasCode && !!entry?.totp;
        if (firstCode) hasCode = true;
        snapshot(firstItem || firstCode || processed === candidates.length);
      }
    };
    try {
      await Promise.all(Array.from({ length: Math.min(candidates.length, TOTP_WORKER_COUNT) }, worker));
      signal?.throwIfAborted();
      return { ...progress, processed, items: items.filter((item): item is TotpResource => item !== undefined) };
    } finally {
      // Never leave a throttled trailing update behind after completion or cancellation.
      if (trailingSnapshot) clearTimeout(trailingSnapshot);
    }
  }

  public async getSecret(resourceId: string, signal?: AbortSignal) {
    // Ensure we're authenticated before fetching secret
    await this.authenticate();

    const res = await this.request(`/secrets/resource/${resourceId}.json`, { signal });
    const json = (await res.json()) as PassboltResponse<Secret>;
    return json.body;
  }

  public async decryptSecretData(encryptedData: string): Promise<string> {
    const userPrivateKey = await this.getPrivateKey();
    const message = await openpgp.readMessage({ armoredMessage: encryptedData });
    const { data: decrypted } = await openpgp.decrypt({
      message,
      decryptionKeys: userPrivateKey,
    });

    if (typeof decrypted !== "string") throw new Error("Unexpected decrypted secret format");
    return decrypted;
  }

  public async decryptSecret(encryptedData: string) {
    const decrypted = await this.decryptSecretData(encryptedData);
    // Password-copy actions extract only the password; Authenticator needs the complete secret object.
    try {
      const secretData = JSON.parse(decrypted as string);
      // Return just the password field if it exists, otherwise return the whole decrypted data
      return secretData.password || (decrypted as string);
    } catch {
      // If it's not JSON, return as-is
      return decrypted as string;
    }
  }

  public async getResourceTypes() {
    // Resource types are the vault schema: they rarely change, so fetch them once per
    // client and reuse them across Authenticator refreshes. The shared fetch is
    // deliberately not tied to any caller's AbortSignal: a load cancelled mid-fetch
    // (e.g. Refresh aborting the old load) must not poison the cache for the next one.
    // Failures are not cached.
    if (!this.resourceTypes) {
      const pending = this.fetchResourceTypes().catch((error: unknown) => {
        if (this.resourceTypes === pending) this.resourceTypes = undefined;
        throw error;
      });
      this.resourceTypes = pending;
    }
    return this.resourceTypes;
  }

  private async fetchResourceTypes() {
    await this.authenticate();
    const res = await this.request("/resource-types.json");
    if (!res.ok) throw new Error(`Unable to fetch resource types (HTTP ${res.status})`);
    const json = (await res.json()) as PassboltResponse<ResourceType[]>;
    if (!Array.isArray(json.body)) throw new Error("Invalid resource type response from Passbolt");
    return json.body;
  }

  public async createResource(data: {
    name: string;
    username: string;
    uri: string;
    password: string;
    description: string;
  }) {
    await this.authenticate();

    // 1. Get Resource Type ID for "Password"
    const types = await this.getResourceTypes();
    const passwordType = types.find((t: ResourceType) => t.slug === "password");
    if (!passwordType) {
      throw new Error("Could not find 'password' resource type.");
    }

    // 2. Prepare Keys
    const userPrivateKey = await this.getPrivateKey();
    const userPublicKey = userPrivateKey.toPublic();

    // 3. Encrypt Metadata
    const metadataJson = JSON.stringify({
      name: data.name,
      username: data.username,
      uri: data.uri,
      description: data.description,
    });

    const unsignedMetadata = await openpgp.createMessage({ text: metadataJson });
    const encryptedMetadata = await openpgp.encrypt({
      message: unsignedMetadata,
      encryptionKeys: userPublicKey,
      signingKeys: userPrivateKey,
    });

    // 4. Encrypt Secret (Password)
    const unsignedSecret = await openpgp.createMessage({ text: data.password });
    const encryptedSecret = await openpgp.encrypt({
      message: unsignedSecret,
      encryptionKeys: userPublicKey,
      signingKeys: userPrivateKey,
    });

    // 5. Send Request
    // Note: The API sample showed "secrets": ["..."] but usually it's an object or the API expects a specific format.
    // The sample showed "secrets": ["-----BEGIN PGP MESSAGE-----"]
    // Let's try sending the string directly in the array as per sample.
    const payload = {
      resource_type_id: passwordType.id,
      personal: true,
      folder_parent_id: null,
      metadata: encryptedMetadata,
      secrets: [encryptedSecret],
    };

    await this.request("/resources.json", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}

// One client per command process: the session, unlocked private key, and metadata-key
// caches are reused instead of being rebuilt by every component that needs the vault.
let sharedClient: PassboltClient | undefined;

export function getPassboltClient(): PassboltClient {
  sharedClient ??= new PassboltClient();
  return sharedClient;
}
