/**
 * Kiri's device API (the same one the Kiri Obsidian plugin uses). No Raycast imports, so it can be
 * tested with a fake fetch. Tokens are only ever sent in the Authorization header, never logged.
 */

export const KIRI_API_BASE = "https://api.project-kiri.com";
export const KIRI_SITE = "https://project-kiri.com";
export const PROGRESS_URL = `${KIRI_SITE}/dashboard`;
export const PRICING_URL = `${KIRI_SITE}/pricing`;
/** The client name Kiri knows this extension by. */
export const CLIENT = "raycast";
export const DEVICE_NAME = "Raycast on this Mac";

export type FetchFn = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<{
  status: number;
  text: () => Promise<string>;
  arrayBuffer: () => Promise<ArrayBuffer>;
}>;

/** status 0 means the request never got an answer (offline, DNS, timeout). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Worth trying again later: offline, server trouble, rate limits. */
  get retryable(): boolean {
    return this.status === 0 || this.status === 408 || this.status === 429 || this.status >= 500;
  }
}

export interface AccountSummary {
  name: string;
  emailHint: string;
}

export interface RemoteSound {
  key: string;
  label: string;
  available: boolean;
}

export type Plan = "free" | "trial" | "paid";

export interface MeResponse {
  account: AccountSummary;
  plan: Plan | null;
  sounds: RemoteSound[];
  /** All kiris the account has earned; null when the server did not send a usable number. */
  kirisTotal: number | null;
}

export interface DeviceStart {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  intervalSeconds: number;
  expiresInSeconds: number;
}

export type TokenPoll =
  | { kind: "pending" }
  | { kind: "slow_down" }
  | { kind: "denied" }
  | { kind: "expired" }
  | { kind: "ok"; token: string; account: AccountSummary };

export interface FocusSessionBody {
  client_block_id: string;
  started_at: string;
  duration_seconds: number;
  ambient: string;
  binaural: string;
  intent: string;
}

const REQUEST_TIMEOUT_MS = 20_000;
/** A sound is a file of about 15 MB: allow a slow connection time to fetch it. */
const AUDIO_TIMEOUT_MS = 180_000;

/** Node's fetch with a timeout. */
export const nodeFetch: FetchFn = async (url, init) => {
  const timeout = init.headers.Accept === "audio/mpeg" ? AUDIO_TIMEOUT_MS : REQUEST_TIMEOUT_MS;
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeout) });
  return { status: res.status, text: () => res.text(), arrayBuffer: () => res.arrayBuffer() };
};

export class KiriApi {
  constructor(
    private readonly token: string | null = null,
    private readonly http: FetchFn = nodeFetch,
    readonly base: string = KIRI_API_BASE,
  ) {}

  async startDevice(): Promise<DeviceStart> {
    const o = asObject(
      await this.json("POST", "/api/device/start", { client: CLIENT, device_name: DEVICE_NAME }, false),
    );
    const deviceCode = str(o.device_code);
    const userCode = str(o.user_code);
    const verificationUrl = str(o.verification_url);
    if (!deviceCode || !userCode || !verificationUrl.startsWith(`${KIRI_SITE}/`)) {
      throw new ApiError(200, "bad_response", "Unexpected answer from Kiri.");
    }
    return {
      deviceCode,
      userCode,
      verificationUrl,
      intervalSeconds: positive(o.interval, 5),
      expiresInSeconds: positive(o.expires_in, 600),
    };
  }

  async pollToken(deviceCode: string): Promise<TokenPoll> {
    try {
      const o = asObject(await this.json("POST", "/api/device/token", { device_code: deviceCode }, false));
      const token = str(o.access_token);
      if (!token.startsWith("kdt_")) throw new ApiError(200, "bad_response", "Unexpected answer from Kiri.");
      return { kind: "ok", token, account: parseAccount(o.account) };
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      if (err.code === "authorization_pending") return { kind: "pending" };
      if (err.code === "slow_down" || err.status === 429) return { kind: "slow_down" };
      if (err.code === "access_denied") return { kind: "denied" };
      if (err.code === "expired_token") return { kind: "expired" };
      throw err;
    }
  }

  async me(): Promise<MeResponse> {
    return parseMe(await this.json("GET", "/api/device/me", undefined, true));
  }

  /** The audio file of a sound (audio/mpeg). Needs a token. */
  async sound(key: string): Promise<ArrayBuffer> {
    const res = await this.send("GET", `/api/device/sounds/${encodeURIComponent(key)}`, undefined, true, "audio/mpeg");
    return res.arrayBuffer();
  }

  /** Brown noise, which Kiri plays for everyone, also without an account. */
  async publicBrownNoise(): Promise<ArrayBuffer> {
    const res = await this.send("GET", "/stream/ambient/brownnoise", undefined, false, "audio/mpeg");
    return res.arrayBuffer();
  }

  /** Save a finished block. Returns the kiris it earned (0 for a block Kiri already had). */
  async postFocusSession(body: FocusSessionBody): Promise<number> {
    const res = await this.send("POST", "/api/device/focus-sessions", body, true);
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(await res.text());
    } catch {
      // Saved, but the answer had no readable body.
    }
    return parseKirisEarned(res.status, parsed);
  }

  async revoke(): Promise<void> {
    await this.send("DELETE", "/api/device/token", undefined, true);
  }

  private async json(method: string, path: string, body: unknown, auth: boolean): Promise<unknown> {
    const res = await this.send(method, path, body, auth);
    try {
      return JSON.parse(await res.text());
    } catch {
      throw new ApiError(res.status, "bad_response", "Unexpected answer from Kiri.");
    }
  }

  private async send(method: string, path: string, body: unknown, auth: boolean, accept = "application/json") {
    const headers: Record<string, string> = { Accept: accept };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (auth) {
      if (!this.token) throw new ApiError(401, "not_connected", "Not connected to a Kiri account.");
      headers.Authorization = `Bearer ${this.token}`;
    }
    let res: Awaited<ReturnType<FetchFn>>;
    try {
      res = await this.http(`${this.base}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, "network", "Kiri could not be reached. Check your connection.");
    }
    if (res.status >= 200 && res.status < 300) return res;
    let code = `http_${res.status}`;
    let message = `Kiri answered with an error (${res.status}).`;
    try {
      const o = asObject(JSON.parse(await res.text()));
      if (str(o.error)) code = str(o.error);
      if (str(o.message)) message = str(o.message).slice(0, 200);
    } catch {
      // Not JSON; keep the generic message.
    }
    throw new ApiError(res.status, code, message);
  }
}

/** Read /api/device/me defensively: unknown or missing fields get safe defaults. */
export function parseMe(body: unknown): MeResponse {
  const o = asObject(body);
  const plan = o.plan === "free" || o.plan === "trial" || o.plan === "paid" ? o.plan : null;
  const sounds: RemoteSound[] = [];
  if (Array.isArray(o.sounds)) {
    for (const item of o.sounds) {
      const s = asObject(item);
      const key = str(s.key);
      if (!/^[a-z0-9_-]{1,40}$/.test(key)) continue;
      sounds.push({ key, label: str(s.label).slice(0, 40) || key, available: s.available === true });
    }
  }
  return { account: parseAccount(o.account), plan, sounds, kirisTotal: parseKiriCount(o.kiris_total) };
}

export function parseKiriCount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) return null;
  return Math.floor(value);
}

/** Only a 201 (a new block) earns kiris; a 200 repeats a block Kiri already counted. */
export function parseKirisEarned(status: number, body: unknown): number {
  if (status !== 201) return 0;
  const value = asObject(body).kiris_earned;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 1_000_000) return 0;
  return Math.round(value * 100) / 100;
}

export function formatKiris(n: number): string {
  return n === 1 ? "1 kiri" : `${n} kiris`;
}

function parseAccount(value: unknown): AccountSummary {
  const a = asObject(value);
  return { name: str(a.name).slice(0, 100), emailHint: str(a.email_hint).slice(0, 100) };
}

export function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function positive(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}
