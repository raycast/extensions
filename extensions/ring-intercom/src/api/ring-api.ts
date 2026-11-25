import { LocalStorage } from "@raycast/api";
import { RingAuthenticationError, TwoFactorError } from "../errors";
import { BaseRingDevice, RingDevicesResponse, RingIntercomDevice, TokenResponse } from "../types";
import { STORAGE_KEYS } from "../utils/storage";

const INTERCOM_KINDS: readonly string[] = ["intercom_handset_audio", "intercom_handset_video"];

const RING_HEADERS = {
  Accept: "application/json",
  "User-Agent": "android:com.ringapp",
};

export interface Intercom {
  id: string;
  name: string;
  // Undefined when Ring doesn't say.
  online?: boolean;
  battery?: number;
}

function toPercentage(value: unknown): number | undefined {
  const level = typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : NaN;
  // Some Ring devices report other units here (for example 4003); only a percentage is shown.
  return Number.isFinite(level) && level >= 0 && level <= 100 ? Math.round(level) : undefined;
}

// Like ring-client-api: the lowest of the device's batteries, from battery_life.
export function batteryLevel(device: RingIntercomDevice): number | undefined {
  const levels = [device.battery_life, device.battery_life_2]
    .map(toPercentage)
    .filter((level): level is number => level !== undefined);
  return levels.length > 0 ? Math.min(...levels) : toPercentage(device.health?.battery_percentage);
}

export function toIntercom(device: RingIntercomDevice): Intercom {
  const id = String(device.id);
  const connection = device.alerts?.connection;
  return {
    id,
    name: device.description || `Intercom ${id}`,
    online: connection === "online" ? true : connection === "offline" ? false : undefined,
    battery: batteryLevel(device),
  };
}

function isIntercom(device: BaseRingDevice): device is RingIntercomDevice {
  return INTERCOM_KINDS.includes(device.kind);
}

export class RingApi {
  private readonly TIMEOUT_MS = 5000;
  private readonly BASE_URL = "https://oauth.ring.com/oauth/token";

  private readonly ERROR_MESSAGES: Record<number, string> = {
    404: "Ring service endpoint not found. Please try again later",
    401: "Unauthorized. Please log in again",
    403: "Access denied. Please check your credentials",
    429: "Too many requests. Please try again later",
    ...Object.fromEntries(
      [500, 502, 503, 504].map((code) => [code, "Ring servers are currently unavailable. Please try again later"]),
    ),
  } as const;

  // Ring replaces it on each use; this is always the latest one.
  private refreshToken: string;
  // One token refresh shared by the requests this instance makes, until the access token expires. Cleared if it
  // fails, so the next request retries.
  private accessToken?: Promise<{ token: string; expiresAt: number }>;

  constructor(config: { refreshToken: string }) {
    this.refreshToken = config.refreshToken;
  }

  // The saved sign-in, or a SIGNED_OUT error.
  static async fromStorage(): Promise<RingApi> {
    const [refreshToken] = await Promise.all([
      LocalStorage.getItem<string>(STORAGE_KEYS.REFRESH_TOKEN),
      // Earlier versions saved the password. Every command removes it, not only Authenticate.
      LocalStorage.removeItem(STORAGE_KEYS.PASSWORD),
    ]);
    if (!refreshToken) {
      throw new RingAuthenticationError("SIGNED_OUT", "No refresh token", "Run Authenticate to sign in to Ring");
    }
    return new RingApi({ refreshToken });
  }

  // timeoutMs: null waits for Ring however long it takes.
  private async request(url: string, options: RequestInit, timeoutMs: number | null = this.TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = timeoutMs === null ? undefined : setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
      const timedOut = controller.signal.aborted;
      throw new RingAuthenticationError(
        "NETWORK_ERROR",
        `Request to ${new URL(url).host} failed: ${error}`,
        timedOut ? "Ring didn't respond in time. Please try again" : "Can't reach Ring. Check your internet connection",
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private errorFor(response: Response, context: string): Error {
    return new Error(this.ERROR_MESSAGES[response.status] ?? `Ring couldn't ${context} (HTTP ${response.status})`);
  }

  private async parseJsonResponse<T>(response: Response, context: string): Promise<T> {
    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new Error(`Failed to parse ${context} response: ${error}`);
    }
  }

  public async getIntercoms(): Promise<Intercom[]> {
    const access_token = await this.getAccessToken();

    const response = await this.request("https://api.ring.com/clients_api/ring_devices", {
      headers: { ...RING_HEADERS, Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    });
    if (!response.ok) {
      throw this.errorFor(response, "list your devices");
    }

    const devices = await this.parseJsonResponse<RingDevicesResponse>(response, "devices");
    return (devices.other ?? []).filter(isIntercom).map(toIntercom);
  }

  async unlock(intercom: Intercom): Promise<void> {
    const access_token = await this.getAccessToken();

    // No timeout: the intercom answers through Ring, and giving up early could report a failure for a door that opened.
    const response = await this.request(
      `https://api.ring.com/commands/v1/devices/${intercom.id}/device_rpc`,
      {
        method: "PUT",
        headers: { ...RING_HEADERS, Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          command_name: "device_rpc",
          request: {
            jsonrpc: "2.0",
            method: "unlock_door",
            params: {
              door_id: 0,
              issue_time: Date.now(),
              origin: "user",
              user_id: "0",
            },
          },
        }),
      },
      null,
    );

    const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } };

    if (!response.ok) {
      throw this.errorFor(response, "unlock the door");
    }

    if (data.error) {
      throw new Error(`Ring couldn't unlock the door: ${data.error.message ?? "unknown error"}`);
    }
  }

  async authenticate(email: string, password: string, twoFactorCode: string, hardwareId: string): Promise<string> {
    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      accept: "application/json",
      "user-agent": "android:com.ringapp",
      Hardware_ID: hardwareId,
      "totp-version": "1",
      "2fa-Support": "true",
      ...(twoFactorCode ? { "2fa-Code": twoFactorCode } : {}),
    };

    const body = {
      client_id: "ring_official_android",
      grant_type: "password",
      password,
      username: email,
      scope: "client",
    };

    const response = await this.request(this.BASE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    try {
      const text = await response.text();
      const parsedData = JSON.parse(text) as TokenResponse;

      if (parsedData.tsv_state && !parsedData.refresh_token) {
        if (!twoFactorCode) {
          throw new TwoFactorError(parsedData.tsv_state, parsedData?.phone);
        } else {
          this.handleAuthError({ ...parsedData, error: "code is invalid" });
        }
      }

      if (parsedData.error) {
        this.handleAuthError(parsedData);
      }

      if (!parsedData.refresh_token) {
        throw new Error(`Ring didn't return a sign-in token (HTTP ${response.status})`);
      }

      return parsedData.refresh_token;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Failed to parse authentication response: ${error.message}`);
      }
      throw error;
    }
  }

  private handleAuthError(parsedData: TokenResponse): never {
    const error = parsedData.error?.toLowerCase() ?? "";
    const description = parsedData.error_description?.toLowerCase() ?? "";

    if (error.includes("too many requests") || description.includes("too many requests")) {
      throw new RingAuthenticationError(
        "INVALID_CREDENTIALS",
        "Too many attempts",
        "Too many attempts. Please try again later",
      );
    }

    if (error.includes("code is invalid")) {
      throw new RingAuthenticationError("INVALID_CREDENTIALS", "Invalid verification code", "Please try again");
    }

    throw new RingAuthenticationError(
      "INVALID_CREDENTIALS",
      error || description,
      "Please check your email and password",
    );
  }

  private async getAccessToken(): Promise<string> {
    if (!this.accessToken) {
      const exchange = this.fetchAccessToken();
      this.accessToken = exchange;
      exchange.catch(() => {
        if (this.accessToken === exchange) this.accessToken = undefined;
      });
    }
    const current = this.accessToken;
    const { token, expiresAt } = await current;
    if (Date.now() < expiresAt) {
      return token;
    }
    if (this.accessToken === current) this.accessToken = undefined;
    return this.getAccessToken();
  }

  private async fetchAccessToken(): Promise<{ token: string; expiresAt: number }> {
    const tokenResponse = await this.request(this.BASE_URL, {
      method: "POST",
      headers: {
        ...RING_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        "2fa-support": "true",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.refreshToken,
        client_id: "ring_official_android",
        scope: "client",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const { error, error_description } = (await tokenResponse.json().catch(() => ({}))) as TokenResponse;
      // Ring turned down the saved sign-in: it expired or was revoked. Signing in again fixes that, but not other
      // failures, such as 429, 5xx or a rejected request, which leave the sign-in as it is.
      const rejected = tokenResponse.status === 400 || tokenResponse.status === 401;
      if (rejected && (!error || ["invalid_grant", "invalid_token", "unauthorized"].includes(error))) {
        throw new RingAuthenticationError(
          "SIGNED_OUT",
          error_description || error || `HTTP ${tokenResponse.status}`,
          "Your Ring sign-in has expired. Run Authenticate to sign in again",
        );
      }
      if (error && !this.ERROR_MESSAGES[tokenResponse.status]) {
        throw new Error(`Ring couldn't refresh your sign-in: ${error_description || error}`);
      }
      throw this.errorFor(tokenResponse, "refresh your sign-in");
    }

    const parsedData = await this.parseJsonResponse<TokenResponse>(tokenResponse, "token refresh");
    const access_token = parsedData.access_token;
    if (!access_token) {
      throw new Error("Ring didn't return an access token. Please try again");
    }

    // Ring replaces the refresh token on each use. Save the new one.
    if (parsedData.refresh_token) {
      this.refreshToken = parsedData.refresh_token;
      await LocalStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, parsedData.refresh_token);
    }

    // Renew a minute early, and keep a token at least 30 seconds.
    const lifetime = Math.max((parsedData.expires_in ?? 3600) - 60, 30);
    return { token: access_token, expiresAt: Date.now() + lifetime * 1000 };
  }
}
