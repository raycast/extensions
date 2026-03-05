import { Cache, getPreferenceValues } from "@raycast/api";
import { buildBaseURL } from "../utils";
import { fetchWithTimeout, PiholeConnectionError } from "./shared";
import { generateTOTP } from "./totp";

const SID_CACHE_KEY = "pihole_v6_sid";
const SID_TTL_MS = 240_000; // 240s — safety margin on server default (configurable, default 1800s)

interface AuthResponse {
  session: {
    sid: string;
    validity: number;
  };
}

interface SessionEntry {
  sid: string;
  expiresAt: number;
}

export class SessionManager {
  private cache = new Cache();
  private baseURL: string;
  private password: string;
  private totpSecret: string | undefined;
  private authPromise: Promise<string> | null = null;

  constructor() {
    const { PIHOLE_URL, API_TOKEN, TOTP_SECRET } = getPreferenceValues<{
      PIHOLE_URL: string;
      API_TOKEN: string;
      TOTP_SECRET?: string;
    }>();
    this.baseURL = `${buildBaseURL(PIHOLE_URL, "https")}/api`;
    this.password = API_TOKEN;
    this.totpSecret = TOTP_SECRET || undefined;
  }

  private getCachedSID(): string | null {
    const raw = this.cache.get(SID_CACHE_KEY);
    if (!raw) return null;
    try {
      const entry: SessionEntry = JSON.parse(raw);
      if (Date.now() > entry.expiresAt) {
        this.cache.remove(SID_CACHE_KEY);
        return null;
      }
      return entry.sid;
    } catch {
      this.cache.remove(SID_CACHE_KEY);
      return null;
    }
  }

  private cacheSID(sid: string, validitySeconds?: number): void {
    const ttl = validitySeconds ? Math.max((validitySeconds - 60) * 1000, 30_000) : SID_TTL_MS;
    const entry: SessionEntry = { sid, expiresAt: Date.now() + ttl };
    this.cache.set(SID_CACHE_KEY, JSON.stringify(entry));
  }

  private async authenticate(): Promise<string> {
    const authBody: { password: string; totp?: number } = {
      password: this.password,
    };
    if (this.totpSecret) {
      authBody.totp = generateTOTP(this.totpSecret);
    }

    const response = await fetchWithTimeout(`${this.baseURL}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authBody),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new PiholeConnectionError(
          "Invalid password. Check your Pi-hole password in extension preferences. If 2FA is enabled, set your TOTP secret or use an app password."
        );
      }
      throw new PiholeConnectionError(`Authentication failed (HTTP ${response.status}).`);
    }

    const data = (await response.json()) as AuthResponse;
    const sid = data.session?.sid;
    if (!sid) {
      throw new PiholeConnectionError("Authentication response missing session ID.");
    }

    this.cacheSID(sid, data.session.validity);
    return sid;
  }

  private invalidateSID(): void {
    this.cache.remove(SID_CACHE_KEY);
  }

  private async ensureSID(): Promise<string> {
    const cached = this.getCachedSID();
    if (cached) return cached;

    if (this.authPromise) return this.authPromise;

    this.authPromise = this.authenticate().finally(() => {
      this.authPromise = null;
    });
    return this.authPromise;
  }

  async request<T>(path: string, options?: RequestInit): Promise<T> {
    let sid = await this.ensureSID();

    const doRequest = async (sessionId: string) => {
      const url = `${this.baseURL}${path}`;
      const headers: Record<string, string> = {
        ...(options?.headers as Record<string, string>),
        "X-FTL-SID": sessionId,
      };
      if (options?.body) {
        headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
      }
      return fetchWithTimeout(url, { ...options, headers });
    };

    let response = await doRequest(sid);

    // On 401, re-authenticate once and retry
    if (response.status === 401) {
      this.invalidateSID();
      sid = await this.authenticate();
      response = await doRequest(sid);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new PiholeConnectionError(`Pi-hole API error (HTTP ${response.status}): ${body}`);
    }

    return (await response.json()) as T;
  }

  async requestText(path: string, options?: RequestInit): Promise<string> {
    let sid = await this.ensureSID();

    const doRequest = async (sessionId: string) => {
      const url = `${this.baseURL}${path}`;
      const headers: Record<string, string> = {
        ...(options?.headers as Record<string, string>),
        "X-FTL-SID": sessionId,
      };
      if (options?.body) {
        headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
      }
      return fetchWithTimeout(url, { ...options, headers }, 30_000);
    };

    let response = await doRequest(sid);

    if (response.status === 401) {
      this.invalidateSID();
      sid = await this.authenticate();
      response = await doRequest(sid);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new PiholeConnectionError(`Pi-hole API error (HTTP ${response.status}): ${body}`);
    }

    return await response.text();
  }

  async requestBuffer(path: string, options?: RequestInit): Promise<Buffer> {
    let sid = await this.ensureSID();

    const doRequest = async (sessionId: string) => {
      const url = `${this.baseURL}${path}`;
      const headers: Record<string, string> = {
        ...(options?.headers as Record<string, string>),
        "X-FTL-SID": sessionId,
      };
      return fetchWithTimeout(url, { ...options, headers }, 30_000);
    };

    let response = await doRequest(sid);

    if (response.status === 401) {
      this.invalidateSID();
      sid = await this.authenticate();
      response = await doRequest(sid);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new PiholeConnectionError(`Pi-hole API error (HTTP ${response.status}): ${body}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
