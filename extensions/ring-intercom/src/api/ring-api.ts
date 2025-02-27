import fetch from "cross-fetch";
import { RingAuthenticationError, TwoFactorError } from "../errors";
import { TokenResponse, RingIntercomDevice, RingDevicesResponse } from "../types";
import { LocalStorage } from "@raycast/api";

export class RingIntercom {
  constructor(
    private readonly device: RingIntercomDevice,
    private readonly access_token: string,
  ) {}

  get description(): string | undefined {
    return this.device.description;
  }

  async unlock(): Promise<void> {
    console.debug("Sending unlock_door command");
    const response = await fetch(`https://api.ring.com/commands/v1/devices/${this.device.id}/device_rpc`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.access_token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "android:com.ringapp",
        Connection: "close",
      },
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
    });

    console.debug("RPC response status:", response.status);
    const data = await response.json().catch(() => ({}));
    console.debug("RPC response data:", data);

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.status}`);
    }

    if (data.error) {
      throw new Error(`RPC error: ${data.error.message} - ${data.error.data || ""}`);
    }
  }
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

  private readonly refreshToken: string;

  constructor(config: { refreshToken: string }) {
    this.refreshToken = config.refreshToken;
  }

  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async parseJsonResponse<T>(response: Response, context: string): Promise<T> {
    try {
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to parse ${context} response: ${error}`);
    }
  }

  public async getLocations(): Promise<{ intercoms: RingIntercom[] }> {
    const access_token = await this.getAccessToken();

    console.debug("Fetching device locations");
    const response = await this.fetchWithTimeout("https://api.ring.com/clients_api/ring_devices", {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "android:com.ringapp",
        Connection: "close",
      },
    });

    const devices = await this.parseJsonResponse<RingDevicesResponse>(response, "devices");
    console.debug("Found", devices.other.length, "devices");

    const intercoms = devices.other
      .filter((device): device is RingIntercomDevice => device.kind === "intercom_handset_audio")
      .map((device) => new RingIntercom(device, access_token));

    return { intercoms };
  }

  async getFirstIntercom(): Promise<RingIntercom | null> {
    console.debug("Getting first intercom");
    const locations = await this.getLocations();
    const intercom = locations.intercoms[0] ?? null;
    console.debug(intercom ? "Intercom found" : "No intercom found");
    return intercom;
  }

  async unlockDoorSequence(intercom: RingIntercom) {
    await intercom.unlock();
    console.debug("Door unlocked successfully");
  }

  async authenticate(
    email: string,
    password: string,
    twoFactorCode: string,
    hardwareId: string,
    tsv_state?: string,
  ): Promise<string> {
    console.debug("Starting authentication", { hasTwoFactorCode: !!twoFactorCode, tsv_state });

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

    console.debug("Auth request details:", {
      url: this.BASE_URL,
      headers,
      body: { ...body, password: "***" },
    });

    const response = await this.fetchWithTimeout(this.BASE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    console.debug("Auth response status:", response.status, response.statusText);

    try {
      const text = await response.text();
      const parsedData = JSON.parse(text) as TokenResponse;

      if (parsedData.tsv_state && !parsedData.refresh_token) {
        if (!twoFactorCode) {
          console.debug("2FA required, throwing TwoFactorError");
          throw new TwoFactorError(parsedData.tsv_state, parsedData?.phone);
        } else {
          console.debug("Invalid 2FA code");
          this.handleAuthError({ ...parsedData, error: "code is invalid" });
        }
      }

      if (parsedData.error) {
        this.handleAuthError(parsedData);
      }

      return parsedData.refresh_token ?? "";
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

    if (error.includes("too many requests")) {
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
    console.debug("Getting access token using refresh token");

    const tokenResponse = await this.fetchWithTimeout(this.BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": "android:com.ringapp",
        "2fa-support": "true",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.refreshToken,
        client_id: "ring_official_android",
        scope: "client",
      }).toString(),
    });

    const parsedData = await this.parseJsonResponse<TokenResponse>(tokenResponse, "token refresh");

    if (parsedData.error) {
      this.handleAuthError(parsedData);
    }

    const access_token = parsedData.access_token;
    if (!access_token) {
      throw new RingAuthenticationError(
        "INVALID_CREDENTIALS",
        "No access token in response",
        "Failed to get access token",
      );
    }

    if (parsedData.refresh_token) {
      await LocalStorage.setItem("RING_REFRESH_TOKEN", parsedData.refresh_token);
    }

    return access_token;
  }
}
