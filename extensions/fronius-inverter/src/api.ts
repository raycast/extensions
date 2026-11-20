import {
  ApiVersionInfo,
  InverterInfoResponse,
  InverterRealtimeDataResponse,
  MeterRealtimeDataResponse,
  PowerFlowRealtimeDataResponse,
  StorageRealtimeDataResponse,
} from "./types";

const REQUEST_TIMEOUT_MS = 10_000;

interface ApiEnvelope {
  Body: unknown;
  Head: {
    Status: {
      Code: number;
      Reason?: string;
      UserMessage?: string;
    };
    Timestamp: string;
  };
}

export class FroniusApiError extends Error {
  constructor(
    message: string,
    readonly code: number,
  ) {
    super(message);
    this.name = "FroniusApiError";
  }
}

export function normalizeBaseUrl(baseUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl.trim());
  } catch {
    throw new Error("Enter a valid Fronius URL, including http:// or https://");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("The Fronius URL must use HTTP or HTTPS");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Do not include credentials in the Fronius URL");
  }

  parsed.search = "";
  parsed.hash = "";
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString().replace(/\/$/, "");
}

export function normalizeBaseUrlOrUndefined(baseUrl: string): string | undefined {
  try {
    return normalizeBaseUrl(baseUrl);
  } catch {
    return undefined;
  }
}

function assertEnvelope(value: unknown): asserts value is ApiEnvelope {
  if (!value || typeof value !== "object") throw new Error("Fronius returned an invalid JSON response");
  const head = (value as { Head?: unknown }).Head;
  if (!head || typeof head !== "object") throw new Error("Fronius response is missing Head");
  const status = (head as { Status?: unknown }).Status;
  if (!status || typeof status !== "object" || typeof (status as { Code?: unknown }).Code !== "number") {
    throw new Error("Fronius response is missing a valid status");
  }

  const { Code, Reason, UserMessage } = status as ApiEnvelope["Head"]["Status"];
  if (Code !== 0) throw new FroniusApiError(Reason || UserMessage || `Fronius API error ${Code}`, Code);
}

async function requestJson(path: string, baseUrl: string): Promise<unknown> {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  let response: Response;

  try {
    response = await fetch(`${normalizedBaseUrl}${path}`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (error) {
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
      throw new Error("Fronius request timed out after 10 seconds", { cause: error });
    }
    throw new Error("Could not reach the configured Fronius inverter", { cause: error });
  }

  if (!response.ok) {
    const status = `${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
    throw new Error(`Fronius request failed with HTTP ${status}`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error("Fronius returned invalid JSON", { cause: error });
  }
  return payload;
}

async function fetchEnvelope<T extends ApiEnvelope>(path: string, baseUrl: string): Promise<T> {
  const payload = await requestJson(path, baseUrl);
  assertEnvelope(payload);
  return payload as T;
}

export async function fetchApiVersion(baseUrl: string): Promise<ApiVersionInfo> {
  const payload = await requestJson("/solar_api/GetAPIVersion.cgi", baseUrl);
  if (!payload || typeof payload !== "object") throw new Error("Fronius returned invalid API version data");

  const { APIVersion, BaseURL, CompatibilityRange } = payload as Partial<ApiVersionInfo>;
  if (typeof APIVersion !== "number" || typeof BaseURL !== "string" || typeof CompatibilityRange !== "string") {
    throw new Error("Fronius API version data is incomplete");
  }
  return { APIVersion, BaseURL, CompatibilityRange };
}

export async function fetchInverterInfo(baseUrl: string): Promise<InverterInfoResponse> {
  const payload = await fetchEnvelope<InverterInfoResponse>("/solar_api/v1/GetInverterInfo.cgi", baseUrl);
  const data = payload.Body?.Data;
  if (!data || typeof data !== "object") throw new Error("Fronius inverter data is missing");
  return payload;
}

export async function fetchPowerFlowRealtimeData(baseUrl: string): Promise<PowerFlowRealtimeDataResponse> {
  const payload = await fetchEnvelope<PowerFlowRealtimeDataResponse>(
    "/solar_api/v1/GetPowerFlowRealtimeData.fcgi",
    baseUrl,
  );
  const site = payload.Body?.Data?.Site;
  if (!site || typeof site !== "object") throw new Error("Fronius site data is missing");
  return payload;
}

export async function fetchInverterRealtimeData(baseUrl: string): Promise<InverterRealtimeDataResponse> {
  const payload = await fetchEnvelope<InverterRealtimeDataResponse>(
    "/solar_api/v1/GetInverterRealtimeData.cgi?Scope=System",
    baseUrl,
  );
  if (!payload.Body?.Data || typeof payload.Body.Data !== "object") {
    throw new Error("Fronius inverter energy data is missing");
  }
  return payload;
}

export async function fetchMeterRealtimeData(baseUrl: string): Promise<MeterRealtimeDataResponse> {
  const payload = await fetchEnvelope<MeterRealtimeDataResponse>(
    "/solar_api/v1/GetMeterRealtimeData.cgi?Scope=System",
    baseUrl,
  );
  if (!payload.Body?.Data || typeof payload.Body.Data !== "object") {
    throw new Error("Fronius Smart Meter data is missing");
  }
  return payload;
}

export async function fetchStorageRealtimeData(baseUrl: string): Promise<StorageRealtimeDataResponse> {
  const payload = await fetchEnvelope<StorageRealtimeDataResponse>(
    "/solar_api/v1/GetStorageRealtimeData.cgi?Scope=System",
    baseUrl,
  );
  if (!payload.Body?.Data || typeof payload.Body.Data !== "object") {
    throw new Error("Fronius battery data is missing");
  }
  return payload;
}
