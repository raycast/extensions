export type RegionCode = "ca" | "eu" | "nz" | "uk" | "us";

export type OneTimeSecretCredentials = {
  username: string;
  apiToken: string;
};

export type ConcealResult = {
  /** Public path segment for `/secret/{id}` */
  secretIdentifier: string;
};

/**
 * Derived from API `is_burned` / `is_received` / `is_viewed` with fixed precedence
 * (burned → received → viewed). When `"none"`, use `state` for display if present.
 */
export type RecentReceiptLifecycle = "burned" | "received" | "viewed" | "none";

/** Normalised receipt row for Recent Secrets UI */
export type RecentReceiptRow = {
  /** Key used in `/private/:key` (metadata / receipt identifier) */
  metadataKey: string;
  secretIdentifier: string | null;
  secretShortid: string | null;
  secretTtlSeconds: number;
  metadataTtlSeconds: number;
  hasPassphrase: boolean;
  createdUnix: number;
  lifecycle: RecentReceiptLifecycle;
  state: string | null;
};

function regionHost(region: RegionCode): string {
  return `${region}.onetimesecret.com`;
}

export function getRegionBaseUrl(region: RegionCode): string {
  return `https://${regionHost(region)}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readBool(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true" || value === "1") {
    return true;
  }
  if (value === "false" || value === "0") {
    return false;
  }
  return Boolean(value);
}

function readNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export class OneTimeSecretClient {
  constructor(
    readonly baseUrl: string,
    private readonly credentials: OneTimeSecretCredentials | null = null,
  ) {}

  public static fromRegion(
    region: RegionCode,
    credentials: OneTimeSecretCredentials | null = null,
  ): OneTimeSecretClient {
    return new OneTimeSecretClient(getRegionBaseUrl(region), credentials);
  }

  public getShareableUrl(secretIdentifier: string): string {
    return `${this.baseUrl}/secret/${secretIdentifier}`;
  }

  /** Web receipt / history page for this metadata key (regional site). */
  public getReceiptHistoryUrl(metadataKey: string): string {
    const base = this.baseUrl.replace(/\/$/, "");
    return `${base}/receipt/${encodeURIComponent(metadataKey)}`;
  }

  public hasCredentials(): boolean {
    return this.credentials !== null;
  }

  private authHeader(): Record<string, string> {
    if (!this.credentials) {
      return {};
    }
    const raw = `${this.credentials.username}:${this.credentials.apiToken}`;
    const encoded = Buffer.from(raw, "utf8").toString("base64");
    return { Authorization: `Basic ${encoded}` };
  }

  private apiUrl(path: string): string {
    const base = this.baseUrl.replace(/\/$/, "");
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${base}/api/v2${p}`;
  }

  private async parseJsonResponse(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new Error(`Invalid JSON response (${response.status}): ${text.slice(0, 200)}`);
    }
  }

  private formatApiError(status: number, body: unknown): string {
    const rec = asRecord(body);
    const message = readString(rec?.message) ?? readString(rec?.error);
    if (message) {
      return `${message} (${status})`;
    }
    return `Request failed (${status})`;
  }

  private async requestJson(
    method: string,
    path: string,
    options: { body?: unknown; auth?: "optional" | "required" } = {},
  ): Promise<unknown> {
    const { body, auth = "optional" } = options;
    if (auth === "required" && !this.credentials) {
      throw new Error("Authentication required. Set username and API token in extension preferences.");
    }

    const headers = new Headers([["Accept", "application/json"]]);
    if (body !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    const shouldSendAuth = auth === "required" || (auth === "optional" && this.credentials !== null);
    if (shouldSendAuth && this.credentials) {
      const authHeaders = new Headers(this.authHeader());
      const authorization = authHeaders.get("Authorization");
      if (authorization) {
        headers.set("Authorization", authorization);
      }
    }

    const response = await fetch(this.apiUrl(path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const parsed = await this.parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(this.formatApiError(response.status, parsed));
    }

    return parsed;
  }

  /**
   * Create a secret. Uses authenticated Basic auth when credentials are set so the secret appears in Recent.
   */
  public async concealSecret(
    secret: string,
    ttlSeconds: number,
    passphrase: string | null = null,
  ): Promise<ConcealResult> {
    const secretPayload: Record<string, unknown> = {
      secret,
      ttl: ttlSeconds,
    };
    if (passphrase && passphrase.length > 0) {
      secretPayload.passphrase = passphrase;
    }

    const body = { secret: secretPayload };
    const data = await this.requestJson("POST", "/secret/conceal", { body, auth: "optional" });

    const root = asRecord(data);
    if (!root || root.success !== true) {
      throw new Error("Unexpected response when creating secret");
    }

    const record = asRecord(root.record);
    const receipt = asRecord(record?.receipt);
    const secretRec = asRecord(record?.secret);

    const secretIdentifier =
      readString(receipt?.secret_identifier) ?? readString(secretRec?.key) ?? readString(secretRec?.identifier) ?? null;

    if (!secretIdentifier) {
      throw new Error("Could not read secret identifier from API response");
    }

    return { secretIdentifier };
  }

  public async getRecentReceipts(): Promise<RecentReceiptRow[]> {
    const data = await this.requestJson("GET", "/private/recent", { auth: "required" });
    return parseRecentResponse(data);
  }

  public async getPrivateMetadata(metadataKey: string): Promise<RecentReceiptRow | null> {
    const encoded = encodeURIComponent(metadataKey);
    const data = await this.requestJson("GET", `/private/${encoded}`, { auth: "required" });
    const row = parseSingleReceiptRecord(data);
    return row;
  }

  public async burn(metadataKey: string): Promise<void> {
    const encoded = encodeURIComponent(metadataKey);
    await this.requestJson("POST", `/private/${encoded}/burn`, {
      auth: "required",
      body: { continue: "true" },
    });
  }
}

export function parseRecentResponse(data: unknown): RecentReceiptRow[] {
  const root = asRecord(data);

  const fromRecords: RecentReceiptRow[] = [];
  if (Array.isArray(root?.records)) {
    for (const item of root.records as unknown[]) {
      const row = normaliseReceiptItem(item);
      if (row) {
        fromRecords.push(row);
      }
    }
  }

  const record = asRecord(root?.record);
  const details =
    asRecord(record?.details) ??
    (Array.isArray(record?.received) || Array.isArray(record?.notreceived) ? record : null) ??
    asRecord(root?.details);

  const received = Array.isArray(details?.received) ? (details.received as unknown[]) : [];
  const notreceived = Array.isArray(details?.notreceived) ? (details.notreceived as unknown[]) : [];

  const fromDetails: RecentReceiptRow[] = [];
  for (const item of [...notreceived, ...received]) {
    const row = normaliseReceiptItem(item);
    if (row) {
      fromDetails.push(row);
    }
  }

  const seen = new Set<string>();
  const rows: RecentReceiptRow[] = [];
  for (const row of [...fromRecords, ...fromDetails]) {
    if (seen.has(row.metadataKey)) {
      continue;
    }
    seen.add(row.metadataKey);
    rows.push(row);
  }

  return rows;
}

function parseSingleReceiptRecord(data: unknown): RecentReceiptRow | null {
  const root = asRecord(data);
  const record = asRecord(root?.record);
  const receipt = asRecord(record?.receipt) ?? asRecord(root?.receipt);
  if (receipt) {
    return normaliseReceiptObject(receipt);
  }
  return normaliseReceiptItem(data);
}

function normaliseReceiptItem(item: unknown): RecentReceiptRow | null {
  const rec = asRecord(item);
  if (!rec) {
    return null;
  }
  const nested = asRecord(rec.receipt);
  return normaliseReceiptObject(nested ?? rec);
}

function normaliseReceiptObject(rec: Record<string, unknown>): RecentReceiptRow | null {
  const metadataKey = readString(rec.key) ?? readString(rec.identifier) ?? readString(rec.metadata_key);
  if (!metadataKey) {
    return null;
  }

  const stateStr = readString(rec.state);
  const isBurned = readBool(rec.is_burned) || stateStr === "burned";
  const isReceived = readBool(rec.is_received) || readBool(rec.is_revealed) || stateStr === "revealed";
  const isViewed = readBool(rec.is_viewed) || readBool(rec.is_previewed) || stateStr === "previewed";
  const lifecycle: RecentReceiptLifecycle = isBurned
    ? "burned"
    : isReceived
      ? "received"
      : isViewed
        ? "viewed"
        : "none";

  const metadataTtl = readNumber(rec.metadata_ttl);
  const receiptTtl = readNumber(rec.receipt_ttl);

  return {
    metadataKey,
    secretIdentifier: readString(rec.secret_identifier),
    secretShortid: readString(rec.secret_shortid) ?? readString(rec.shortid),
    secretTtlSeconds: readNumber(rec.secret_ttl),
    metadataTtlSeconds: metadataTtl > 0 ? metadataTtl : receiptTtl,
    hasPassphrase: readBool(rec.has_passphrase),
    createdUnix: readNumber(rec.created),
    lifecycle,
    state: stateStr,
  };
}
