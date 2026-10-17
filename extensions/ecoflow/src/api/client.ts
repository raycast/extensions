import type { EcoFlowApiDevice, EcoFlowApiResponse, EcoFlowCredentials, JsonObject, JsonValue } from "./types";
import { API_PATHS, ECOFLOW_API_BASE_URL, REQUEST_TIMEOUT_MS } from "../utils/constants";
import { flattenForSignature, generateNonce, generateSignature } from "../utils/signing";

type HttpMethod = "GET" | "POST" | "PUT";

interface RequestDependencies {
  fetch: typeof fetch;
  now(): number;
  nonce(): string;
}

interface RequestOptions {
  query?: JsonObject;
  body?: JsonObject;
}

export class EcoFlowApiError extends Error {
  readonly code?: string;
  readonly status?: number;

  constructor(message: string, details: { code?: string; status?: number } = {}) {
    super(message);
    this.name = "EcoFlowApiError";
    if (details.code !== undefined) this.code = details.code;
    if (details.status !== undefined) this.status = details.status;
  }
}

export class EcoFlowClient {
  private readonly credentials: EcoFlowCredentials;
  private readonly dependencies: RequestDependencies;
  private readonly baseUrl: string;

  constructor(
    credentials: EcoFlowCredentials,
    options: {
      baseUrl?: string;
      dependencies?: Partial<RequestDependencies>;
    } = {},
  ) {
    if (!credentials.accessKey.trim() || !credentials.secretKey.trim()) {
      throw new EcoFlowApiError("EcoFlow credentials are missing. Open the extension preferences and add both keys.");
    }

    this.credentials = credentials;
    this.baseUrl = options.baseUrl ?? ECOFLOW_API_BASE_URL;
    this.dependencies = {
      fetch: options.dependencies?.fetch ?? fetch,
      now: options.dependencies?.now ?? Date.now,
      nonce: options.dependencies?.nonce ?? generateNonce,
    };
  }

  async listDevices(): Promise<EcoFlowApiDevice[]> {
    const data = await this.request<unknown>("GET", API_PATHS.deviceList);
    if (!Array.isArray(data)) throw new EcoFlowApiError("EcoFlow returned an invalid device list.");

    return data.map((value) => {
      if (!isRecord(value) || typeof value.sn !== "string" || typeof value.online !== "number") {
        throw new EcoFlowApiError("EcoFlow returned an invalid device entry.");
      }

      const device: EcoFlowApiDevice = { sn: value.sn, online: value.online };
      if (typeof value.deviceName === "string") device.deviceName = value.deviceName;
      if (typeof value.productName === "string") device.productName = value.productName;
      return device;
    });
  }

  async getAllQuotas(serialNumber: string): Promise<Record<string, JsonValue>> {
    const data = await this.request<unknown>("GET", API_PATHS.deviceQuotaAll, {
      query: { sn: serialNumber },
    });
    if (!isRecord(data)) throw new EcoFlowApiError("EcoFlow returned invalid device readings.");
    return data as Record<string, JsonValue>;
  }

  async queryQuotas(serialNumber: string, quotas: string[]): Promise<Record<string, JsonValue>> {
    const data = await this.request<unknown>("POST", API_PATHS.deviceQuota, {
      body: { sn: serialNumber, params: { quotas } },
    });
    if (!isRecord(data)) throw new EcoFlowApiError("EcoFlow returned invalid device readings.");
    return data as Record<string, JsonValue>;
  }

  async setDeviceCommand(serialNumber: string, command: JsonObject): Promise<void> {
    await this.request<void>("PUT", API_PATHS.deviceQuota, {
      body: { sn: serialNumber, ...command },
    });
  }

  private async request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T | undefined> {
    const timestamp = String(this.dependencies.now());
    const nonce = this.dependencies.nonce();
    const signingInput = method === "GET" ? (options.query ?? {}) : (options.body ?? {});
    const flattened = flattenForSignature(signingInput);
    const sign = generateSignature(flattened, this.credentials.accessKey, this.credentials.secretKey, nonce, timestamp);

    const headers: Record<string, string> = {
      accessKey: this.credentials.accessKey,
      nonce,
      timestamp,
      sign,
    };

    const url = new URL(path, this.baseUrl);
    if (options.query) {
      for (const [key, value] of Object.entries(flattenForSignature(options.query))) {
        url.searchParams.set(key, value);
      }
    }

    const requestInit: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    };

    if (options.body) {
      headers["Content-Type"] = "application/json;charset=UTF-8";
      requestInit.body = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await this.dependencies.fetch(url, requestInit);
    } catch (error) {
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
        throw new EcoFlowApiError("EcoFlow did not respond within 15 seconds.");
      }
      throw new EcoFlowApiError(
        error instanceof Error ? this.redactCredentials(error.message) : "Could not reach the EcoFlow API.",
      );
    }

    let payload: EcoFlowApiResponse<T> | undefined;
    try {
      payload = await readResponsePayload<T>(response);
    } catch (error) {
      if (response.ok) throw error;
    }
    const code = payload ? String(payload.code) : undefined;
    const message = payload?.message?.trim() ? this.redactCredentials(payload.message.trim()) : undefined;

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new EcoFlowApiError("EcoFlow rejected the credentials. Check both keys in extension preferences.", {
          status: response.status,
          ...(code ? { code } : {}),
        });
      }
      throw new EcoFlowApiError(message || `EcoFlow returned HTTP ${response.status}.`, {
        status: response.status,
        ...(code ? { code } : {}),
      });
    }

    if (!payload) {
      throw new EcoFlowApiError("EcoFlow returned an empty or invalid response.");
    }

    if (code !== "0") {
      throw new EcoFlowApiError(
        message ? `${message} (code ${code})` : `EcoFlow returned error code ${code ?? "unknown"}.`,
        code ? { code } : {},
      );
    }

    return payload.data;
  }

  private redactCredentials(message: string): string {
    return [this.credentials.accessKey, this.credentials.secretKey].reduce(
      (sanitized, credential) => (credential ? sanitized.replaceAll(credential, "[redacted]") : sanitized),
      message,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function readResponsePayload<T>(response: Response): Promise<EcoFlowApiResponse<T> | undefined> {
  const text = await response.text();
  if (!text.trim()) return undefined;

  try {
    return JSON.parse(text) as EcoFlowApiResponse<T>;
  } catch {
    throw new EcoFlowApiError("EcoFlow returned a response that was not valid JSON.", { status: response.status });
  }
}
