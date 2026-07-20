import {
  DnsQueryType as DnsQueryTypeEnum,
  type FinishedDnsTestResult,
  type FinishedHttpTestResult,
  type FinishedMtrTestResult,
  type FinishedPingTestResult,
  type FinishedTracerouteTestResult,
  Globalping,
  HttpRequestMethod as HttpRequestMethodEnum,
  MeasurementStatus as MeasurementStatusEnum,
  MeasurementType as MeasurementTypeEnum,
  type CreateMeasurementResponse,
  type MeasurementLocationOption,
  type MeasurementStatus as GlobalpingMeasurementStatus,
  type MeasurementType as GlobalpingMeasurementType,
  type Probe as GlobalpingProbe,
  type ProbeLocation as GlobalpingProbeLocation,
  type TestResult as GlobalpingRawTestResult,
  type TypedMeasurementResponse,
  type TypedMeasurementResultItem,
  type TypedMeasurementRequest,
} from "globalping";

interface GlobalpingErrorPayload {
  error?: {
    type?: string;
    message?: string;
    params?: Record<string, string>;
  };
  links?: {
    documentation?: string;
  };
}

// Types

export { DnsQueryTypeEnum as DnsQueryType, HttpRequestMethodEnum as HttpRequestMethod };
export { MeasurementStatusEnum as MeasurementStatus, MeasurementTypeEnum as MeasurementType };

type MeasurementKind = GlobalpingMeasurementType;
type MeasurementState = GlobalpingMeasurementStatus;
export type TestStatus = GlobalpingRawTestResult["status"];
type GlobalpingProbeResult<T extends MeasurementKind> = TypedMeasurementResultItem<T>;
type SimpleDnsResult = Extract<FinishedDnsTestResult, { answers: unknown[] }>;
type TraceDnsResult = Extract<FinishedDnsTestResult, { hops: unknown[] }>;
type PingResultDetails = Omit<FinishedPingTestResult, "status" | "rawOutput" | "timings"> & {
  timings: Array<{ rtt: number; ttl?: number }>;
};
type ResultBase = Pick<GlobalpingRawTestResult, "status" | "rawOutput">;
type MeasurementFields<T extends MeasurementKind> = Pick<TypedMeasurementResponse<T>, "id" | "type" | "target"> & {
  status: MeasurementState;
} & Partial<Omit<TypedMeasurementResponse<T>, "id" | "type" | "status" | "target" | "results">>;

export interface Location extends Pick<MeasurementLocationOption, "magic"> {
  magic: string;
}

export interface ProbeLocation extends GlobalpingProbeLocation {
  id?: string | number;
  serverId?: string | number;
  probeId?: string | number;
}

export type PingResult = ResultBase & Partial<PingResultDetails>;
export type DnsAnswer = Extract<FinishedDnsTestResult, { answers: unknown[] }>["answers"][number];
export type DnsResult = ResultBase &
  Partial<Omit<SimpleDnsResult, "status" | "rawOutput">> &
  Partial<Omit<TraceDnsResult, "status" | "rawOutput">>;
export type HttpResult = ResultBase & Partial<Omit<FinishedHttpTestResult, "status" | "rawOutput">>;
export type TracerouteHop = FinishedTracerouteTestResult["hops"][number];
export type TracerouteResult = ResultBase & Partial<Omit<FinishedTracerouteTestResult, "status" | "rawOutput">>;
export type MtrHop = FinishedMtrTestResult["hops"][number];
export type MtrResult = ResultBase & Partial<Omit<FinishedMtrTestResult, "status" | "rawOutput">>;

export type TestResult = PingResult | DnsResult | HttpResult | TracerouteResult | MtrResult;

export type ProbeResult<T extends MeasurementKind = MeasurementKind> = Omit<GlobalpingProbeResult<T>, "probe"> & {
  probe: ProbeLocation & GlobalpingProbeResult<T>["probe"];
};

export type Measurement<T extends MeasurementKind = MeasurementKind> = MeasurementFields<T> & {
  results: ProbeResult<T>[];
  resultKeys?: string[];
};

/**
 * Builds the stable portion of a probe key from its location metadata.
 */
export function getProbeResultBaseKey(probe: ProbeLocation): string {
  return [
    probe.continent,
    probe.region,
    probe.country,
    probe.city,
    probe.network,
    probe.asn,
    probe.latitude,
    probe.longitude,
  ].join("|");
}

/**
 * Builds a unique probe key, appending an occurrence suffix when duplicates exist.
 */
export function getProbeResultKey(probe: ProbeLocation, occurrenceIndex?: string | number): string {
  const baseKey = getProbeResultBaseKey(probe);
  if (occurrenceIndex === undefined) {
    return baseKey;
  }

  if (typeof occurrenceIndex === "number" && occurrenceIndex === 0) {
    return baseKey;
  }

  const suffix = String(occurrenceIndex).trim();
  return suffix ? `${baseKey}#${suffix}` : baseKey;
}

/**
 * Reads a stable server-side probe identifier when the API includes one.
 */
export function getProbeResultStableId(probe: ProbeLocation): string | undefined {
  const candidateProbe = probe as ProbeLocation &
    Partial<Record<"id" | "serverId" | "probeId", string | number | null | undefined>>;
  const candidates = [candidateProbe.id, candidateProbe.serverId, candidateProbe.probeId];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) {
      continue;
    }

    const stableId = String(candidate).trim();
    if (stableId) {
      return stableId;
    }
  }

  return undefined;
}

/**
 * Generates stable unique keys for a list of probe results, including duplicates.
 */
export function getProbeResultKeys(results: ProbeResult[]): string[] {
  const seenCounts = new Map<string, number>();

  return results.map((result) => {
    const stableId = getProbeResultStableId(result.probe);
    if (stableId) {
      return getProbeResultKey(result.probe, stableId);
    }

    const baseKey = getProbeResultBaseKey(result.probe);
    const occurrenceIndex = seenCounts.get(baseKey) ?? 0;
    seenCounts.set(baseKey, occurrenceIndex + 1);
    return getProbeResultKey(result.probe, occurrenceIndex);
  });
}

// Payload types

export type MeasurementPayload = TypedMeasurementRequest;

// Client

const DEFAULT_TIMEOUT_MS = 30_000;
const USER_AGENT = "globalping-raycast (https://github.com/jsdelivr/globalping-raycast)";

/**
 * Builds a configured Globalping API client using the current authenticated Raycast session.
 */
function createClient(auth: string, timeout = DEFAULT_TIMEOUT_MS): Globalping<false> {
  return new Globalping({
    auth,
    timeout,
    throwApiErrors: false,
    userAgent: USER_AGENT,
  });
}

async function runClientRequest<T>(
  authToken: string,
  request: (client: Globalping<false>) => Promise<{ ok: boolean; response: Response; data: T | unknown }>,
  options?: { signal?: AbortSignal; timeout?: number },
): Promise<{ ok: boolean; response: Response; data: T | unknown }> {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;
  return raceWithSignal(request(createClient(authToken, timeout)), options?.signal);
}

/**
 * Creates an AbortError compatible with the existing request lifecycle code.
 */
function createAbortError(): Error {
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

/**
 * Preserves AbortSignal behavior even though the official client does not expose per-request cancellation.
 */
async function raceWithSignal<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return promise;
  }

  if (signal.aborted) {
    throw createAbortError();
  }

  return new Promise<T>((resolve, reject) => {
    const handleAbort = () => {
      reject(createAbortError());
    };

    signal.addEventListener("abort", handleAbort, { once: true });

    promise.then(
      (value) => {
        signal.removeEventListener("abort", handleAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", handleAbort);
        reject(error);
      },
    );
  });
}

export class GlobalpingApiError extends Error {
  status: number;
  type?: string;
  details?: string;
  documentationUrl?: string;

  constructor(options: { title: string; status: number; type?: string; details?: string; documentationUrl?: string }) {
    super(options.title);
    this.name = "GlobalpingApiError";
    this.status = options.status;
    this.type = options.type;
    this.details = options.details;
    this.documentationUrl = options.documentationUrl;
  }
}

/**
 * Formats per-parameter validation errors returned by the Globalping API.
 */
function formatValidationDetails(params?: Record<string, string>): string | undefined {
  if (!params) {
    return undefined;
  }

  const entries = Object.entries(params);
  if (entries.length === 0) {
    return undefined;
  }

  return entries.map(([key, value]) => `${key}: ${value}`).join(" • ");
}

/**
 * Turns the Retry-After header into a user-facing rate limit message.
 */
function getRetryAfterMessage(retryAfterHeader: string | null): string {
  if (!retryAfterHeader) {
    return "Too many requests. Try again in a moment.";
  }

  const retryAfterSeconds = Number.parseInt(retryAfterHeader, 10);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return `Too many requests. Try again in ${retryAfterSeconds}s.`;
  }

  return "Too many requests. Try again later.";
}

/**
 * Normalizes structured API error payloads returned by the official client.
 */
function getErrorPayload(data: unknown): GlobalpingErrorPayload | undefined {
  if (!data || typeof data !== "object") {
    return undefined;
  }

  return data as GlobalpingErrorPayload;
}

/**
 * Parses an unsuccessful API response into a structured GlobalpingApiError.
 */
function parseErrorResponse(
  response: Response,
  payload?: GlobalpingErrorPayload,
  fallbackBodyText?: string,
): GlobalpingApiError {
  const type = payload?.error?.type;
  const apiMessage = payload?.error?.message;
  const validationDetails = formatValidationDetails(payload?.error?.params);
  const docsUrl = payload?.links?.documentation;

  switch (response.status) {
    case 400:
    case 422:
      return new GlobalpingApiError({
        title: apiMessage ?? "Invalid Globalping request",
        status: response.status,
        type,
        details: validationDetails ?? "Check the target, location, and command options, then try again.",
        documentationUrl: docsUrl,
      });
    case 401:
      return new GlobalpingApiError({
        title: "Globalping login expired",
        status: response.status,
        type,
        details: "Sign in to Globalping again and retry the measurement.",
        documentationUrl: docsUrl,
      });
    case 403:
      return new GlobalpingApiError({
        title: "Globalping login expired",
        status: response.status,
        type,
        details: "Sign in to Globalping again and retry the measurement.",
        documentationUrl: docsUrl,
      });
    case 404:
      return new GlobalpingApiError({
        title: apiMessage ?? "Globalping resource not found",
        status: response.status,
        type,
        details: "The requested measurement or endpoint could not be found.",
        documentationUrl: docsUrl,
      });
    case 429:
      return new GlobalpingApiError({
        title: apiMessage ?? "Globalping rate limit reached",
        status: response.status,
        type,
        details: getRetryAfterMessage(response.headers.get("Retry-After")),
        documentationUrl: docsUrl,
      });
    default:
      return new GlobalpingApiError({
        title: apiMessage ?? `Globalping API error (${response.status})`,
        status: response.status,
        type,
        details: fallbackBodyText && fallbackBodyText !== apiMessage ? fallbackBodyText : undefined,
        documentationUrl: docsUrl,
      });
  }
}

/**
 * Converts unknown thrown errors into a toast-friendly title/message pair.
 */
export function getGlobalpingErrorDisplay(error: unknown, fallbackTitle = "Globalping request failed") {
  if (error instanceof GlobalpingApiError) {
    return {
      title: error.message,
      message: error.details,
    };
  }

  if (error instanceof Error) {
    const cause = error.cause;
    const causeMessage = cause instanceof Error ? cause.message : typeof cause === "string" ? cause : undefined;

    return {
      title: fallbackTitle,
      message: causeMessage ? `${error.message} — ${causeMessage}` : error.message,
    };
  }

  return {
    title: fallbackTitle,
    message: String(error),
  };
}

/**
 * Reads a successful payload or throws a normalized error for failed API calls.
 */
function unwrapResult<T>(result: { ok: boolean; response: Response; data: T | unknown }): T {
  if (result.ok) {
    return result.data as T;
  }

  const payload = getErrorPayload(result.data);
  const fallbackBodyText = typeof result.data === "string" ? result.data : undefined;
  throw parseErrorResponse(result.response, payload, fallbackBodyText);
}

/**
 * Creates a new measurement and returns its Globalping id.
 */
export async function createMeasurement(
  authToken: string,
  payload: MeasurementPayload,
  signal?: AbortSignal,
): Promise<string> {
  const result = await runClientRequest(authToken, (client) => client.createMeasurement(payload), { signal });
  const data = unwrapResult<CreateMeasurementResponse>(result);
  return data.id;
}

/**
 * Fetches the latest state for an existing measurement.
 */
export async function getMeasurement(authToken: string, id: string, signal?: AbortSignal): Promise<Measurement> {
  const result = await runClientRequest(authToken, (client) => client.getMeasurement(id), { signal });
  return unwrapResult<Measurement>(result);
}

/**
 * Builds a public Globalping share URL for a measurement.
 */
export function getShareUrl(id: string): string {
  return `https://globalping.io/?measurement=${id}`;
}

// Probes

export type Probe = GlobalpingProbe;

/**
 * Fetches the full probe catalogue used to build location suggestions.
 */
export async function getProbes(authToken: string, signal?: AbortSignal): Promise<Probe[]> {
  const result = await runClientRequest(authToken, (client) => client.listProbes(), { signal });
  return unwrapResult<Probe[]>(result);
}
