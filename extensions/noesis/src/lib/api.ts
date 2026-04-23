import {
  EngineExecutionInput,
  EngineExecutionResult,
  EngineSummary,
  HealthSnapshot,
  RateLimitInfo,
  ReadingStat,
  ReadingSummary,
  RemoteSnapshot,
  SelemeneClientConfig,
  UsageSnapshot,
  UserProfileSnapshot,
  UserProfileUpdate,
  UserProfileUpdateResult,
  WorkflowExecutionResult,
  WorkflowSummary,
} from "./types";

interface HealthResponse {
  status: string;
  version: string;
  uptime_seconds: number;
  engines_loaded: number;
  workflows_loaded: number;
}

interface StatusWorkflowResponse {
  id: string;
  name: string;
  description: string;
  engine_count: number;
}

interface StatusResponse {
  engines: string[];
  workflows: StatusWorkflowResponse[];
}

interface EngineInfoResponse {
  engine_id: string;
  engine_name: string;
  required_phase: number;
}

interface WorkflowInfoResponse {
  id: string;
  name: string;
  description: string;
  engine_ids: string[];
}

interface LocationResponse {
  lat: number;
  lng: number;
  name?: string | null;
}

interface UserProfileResponse {
  id: string;
  email: string;
  full_name: string;
  tier: string;
  consciousness_level: number;
  experience_points: number;
  birth_date?: string | null;
  birth_time?: string | null;
  birth_location?: LocationResponse | null;
  timezone?: string | null;
  preferences?: Record<string, unknown> | null;
}

interface UserUsageResponse {
  user_id: string;
  daily: {
    total: number;
    success: number;
    failure: number;
  };
  monthly: {
    total: number;
    success: number;
    failure: number;
  };
  engine_breakdown: Array<{
    engine_id: string;
    request_count: number;
  }>;
}

interface ReadingsListResponse {
  readings: Array<{
    id: string;
    engine_id: string;
    workflow_id?: string | null;
    input_hash: string;
    witness_prompt?: string | null;
    consciousness_level: number;
    calculation_time_ms?: number | null;
    created_at: string;
    input_data?: unknown;
    result_data?: unknown;
    [key: string]: unknown;
  }>;
  total: number;
  limit: number;
  offset: number;
}

interface ReadingsStatsResponse {
  stats: Array<{
    engine_id: string;
    count: number;
  }>;
  total: number;
}

interface ApiErrorResponse {
  error?: string;
  error_code?: string;
  details?: unknown;
}

interface RequestContext {
  auth?: boolean;
}

export interface FetchRemoteSnapshotOptions {
  includeService?: boolean;
  includeCatalog?: boolean;
  includeProfile?: boolean;
  includeUsage?: boolean;
  includeReadings?: boolean;
  readingLimit?: number;
  usageEngineLimit?: number;
  fetchImpl?: typeof fetch;
}

export function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  return trimmed.replace(/\/api\/v1$/, "");
}

export async function validateSelemeneCredentials(
  config: SelemeneClientConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<UserProfileSnapshot> {
  const client = new SelemeneApiClient(config, fetchImpl);
  const profile = await client.getUserProfile();
  return toUserProfile(profile, new Date().toISOString());
}

export async function fetchRemoteSnapshot(
  config: SelemeneClientConfig,
  options: FetchRemoteSnapshotOptions = {},
): Promise<RemoteSnapshot> {
  const client = new SelemeneApiClient(config, options.fetchImpl ?? fetch);
  const fetchedAt = new Date().toISOString();

  const includeService = options.includeService ?? true;
  const includeCatalog = options.includeCatalog ?? true;
  const includeProfile = options.includeProfile ?? true;
  const includeUsage = options.includeUsage ?? true;
  const includeReadings = options.includeReadings ?? true;
  const readingLimit = options.readingLimit ?? 25;
  const usageEngineLimit = options.usageEngineLimit ?? 10;

  let health: HealthSnapshot | undefined;
  let workflows: WorkflowSummary[] | undefined;
  let engines: EngineSummary[] | undefined;

  if (includeService || includeCatalog) {
    const [healthResponse, statusResponse] = await Promise.all([
      client.getHealth(),
      client.getStatus(),
    ]);

    health = toHealthSnapshot(healthResponse, fetchedAt);

    if (includeCatalog) {
      const workflowInfos = await Promise.all(
        statusResponse.workflows.map(async (workflow) => {
          const info = await optionalRequest(() =>
            client.getWorkflowInfo(workflow.id),
          );
          return toWorkflowSummary(workflow, info, fetchedAt);
        }),
      );

      const engineInfos = await Promise.all(
        statusResponse.engines.map(async (engineId) => {
          const info = await optionalRequest(() =>
            client.getEngineInfo(engineId),
          );
          return toEngineSummary(engineId, info, fetchedAt);
        }),
      );

      workflows = workflowInfos;
      engines = engineInfos;
    }
  }

  const [
    profileResponse,
    usageResponse,
    readingsResponse,
    readingStatsResponse,
  ] = await Promise.all([
    includeProfile
      ? optionalRequest(() => client.getUserProfile())
      : Promise.resolve(undefined),
    includeUsage
      ? optionalRequest(() => client.getUserUsage(usageEngineLimit))
      : Promise.resolve(undefined),
    includeReadings
      ? optionalRequest(() =>
          client.getReadings({ limit: readingLimit, offset: 0 }),
        )
      : Promise.resolve(undefined),
    includeReadings
      ? optionalRequest(() => client.getReadingStats())
      : Promise.resolve(undefined),
  ]);

  return {
    baseUrl: normalizeBaseUrl(config.baseUrl),
    health,
    profile: profileResponse
      ? toUserProfile(profileResponse, fetchedAt)
      : undefined,
    usage: usageResponse
      ? toUsageSnapshot(usageResponse, fetchedAt)
      : undefined,
    workflows,
    engines,
    readings: readingsResponse
      ? toReadingSummaries(readingsResponse, fetchedAt)
      : undefined,
    readingStats: readingStatsResponse
      ? toReadingStats(readingStatsResponse, fetchedAt)
      : undefined,
    rateLimit: client.rateLimitInfo,
    fetchedAt,
  };
}

export async function calculateEngine(
  config: SelemeneClientConfig,
  engineId: string,
  input: EngineExecutionInput,
  fetchImpl: typeof fetch = fetch,
): Promise<EngineExecutionResult> {
  const client = new SelemeneApiClient(config, fetchImpl);
  const response = await client.calculateEngine(engineId, input);
  return toEngineExecutionResult(response);
}

export async function executeWorkflow(
  config: SelemeneClientConfig,
  workflowId: string,
  input: EngineExecutionInput,
  fetchImpl: typeof fetch = fetch,
): Promise<WorkflowExecutionResult> {
  const client = new SelemeneApiClient(config, fetchImpl);
  const response = await client.executeWorkflow(workflowId, input);
  return toWorkflowExecutionResult(response);
}

export async function updateUserProfile(
  config: SelemeneClientConfig,
  update: UserProfileUpdate,
  fetchImpl: typeof fetch = fetch,
): Promise<UserProfileUpdateResult> {
  const client = new SelemeneApiClient(config, fetchImpl);
  const response = await client.updateUserProfile(update);
  return toUserProfile(response, new Date().toISOString());
}

class SelemeneApiClient {
  public rateLimitInfo: RateLimitInfo = {};
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    config: SelemeneClientConfig,
    private readonly fetchImpl: typeof fetch,
  ) {
    this.baseUrl = normalizeBaseUrl(config.baseUrl);
    this.apiKey = config.apiKey.trim();

    if (!this.baseUrl) {
      throw new Error(
        "Selemene base URL is missing. Configure it in the API Key command or via the environment.",
      );
    }

    if (!this.apiKey) {
      throw new Error(
        "Selemene Engine API key is missing. Run the API Key command before using the extension.",
      );
    }
  }

  getHealth(): Promise<HealthResponse> {
    return this.requestJson<HealthResponse>(
      "/health/live",
      { method: "GET" },
      { auth: false },
    );
  }

  getStatus(): Promise<StatusResponse> {
    return this.requestJson<StatusResponse>("/api/v1/status");
  }

  getUserProfile(): Promise<UserProfileResponse> {
    return this.requestJson<UserProfileResponse>("/api/v1/users/me");
  }

  updateUserProfile(update: UserProfileUpdate): Promise<UserProfileResponse> {
    return this.requestJson<UserProfileResponse>("/api/v1/users/me", {
      method: "PATCH",
      body: JSON.stringify(toUserProfileRequest(update)),
    });
  }

  getUserUsage(engineLimit = 10): Promise<UserUsageResponse> {
    return this.requestJson<UserUsageResponse>(
      `/api/v1/users/me/usage?engine_limit=${engineLimit}`,
    );
  }

  getEngineInfo(engineId: string): Promise<EngineInfoResponse> {
    return this.requestJson<EngineInfoResponse>(
      `/api/v1/engines/${engineId}/info`,
    );
  }

  calculateEngine(
    engineId: string,
    input: EngineExecutionInput,
  ): Promise<Record<string, unknown>> {
    return this.requestJson<Record<string, unknown>>(
      `/api/v1/engines/${engineId}/calculate`,
      {
        method: "POST",
        body: JSON.stringify(toExecutionRequest(input)),
      },
    );
  }

  getWorkflowInfo(workflowId: string): Promise<WorkflowInfoResponse> {
    return this.requestJson<WorkflowInfoResponse>(
      `/api/v1/workflows/${workflowId}/info`,
    );
  }

  executeWorkflow(
    workflowId: string,
    input: EngineExecutionInput,
  ): Promise<Record<string, unknown>> {
    return this.requestJson<Record<string, unknown>>(
      `/api/v1/workflows/${workflowId}/execute`,
      {
        method: "POST",
        body: JSON.stringify(toExecutionRequest(input)),
      },
    );
  }

  getReadings(params: {
    limit: number;
    offset: number;
  }): Promise<ReadingsListResponse> {
    const search = new URLSearchParams({
      limit: String(params.limit),
      offset: String(params.offset),
    });
    return this.requestJson<ReadingsListResponse>(
      `/api/v1/readings?${search.toString()}`,
    );
  }

  getReadingStats(): Promise<ReadingsStatsResponse> {
    return this.requestJson<ReadingsStatsResponse>("/api/v1/readings/stats");
  }

  private async requestJson<T>(
    path: string,
    init: RequestInit = { method: "GET" },
    context: RequestContext = { auth: true },
  ): Promise<T> {
    const headers = new Headers(init.headers ?? {});
    headers.set("Accept", "application/json");

    if (context.auth !== false) {
      headers.set("X-API-Key", this.apiKey);
    }

    if (init.body) {
      headers.set("Content-Type", "application/json");
    }

    let response: Response;

    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        headers,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown network error";
      throw new Error(
        `Unable to reach Selemene at ${this.baseUrl}${path}. ${message}`,
      );
    }

    this.captureRateLimit(response.headers);

    const text = await response.text();
    const payload = text
      ? (JSON.parse(text) as T | ApiErrorResponse)
      : ({} as T);

    if (!response.ok) {
      throw new Error(
        buildApiErrorMessage(response.status, payload as ApiErrorResponse),
      );
    }

    return payload as T;
  }

  private captureRateLimit(headers: Headers): void {
    const next = parseRateLimitInfo(headers);
    if (Object.values(next).some((value) => typeof value === "number")) {
      this.rateLimitInfo = next;
    }
  }
}

function buildApiErrorMessage(
  status: number,
  payload: ApiErrorResponse,
): string {
  if (status === 401) {
    return "Authentication failed. Check the Selemene Engine API key.";
  }

  if (status === 403) {
    return payload.error ?? "Access denied for this Selemene account.";
  }

  if (status === 404) {
    return payload.error ?? "Requested Selemene resource was not found.";
  }

  if (status === 429) {
    return "Selemene rate limit exceeded. Try again after the limit resets.";
  }

  return payload.error ?? `Selemene request failed with status ${status}.`;
}

function parseRateLimitInfo(headers: Headers): RateLimitInfo {
  return {
    limit: toNumber(headers.get("x-ratelimit-limit")),
    remaining: toNumber(headers.get("x-ratelimit-remaining")),
    reset: toNumber(headers.get("x-ratelimit-reset")),
    dailyRemaining: toNumber(headers.get("x-ratelimit-daily-remaining")),
    dailyReset: toNumber(headers.get("x-ratelimit-daily-reset")),
  };
}

function toHealthSnapshot(
  health: HealthResponse,
  fetchedAt: string,
): HealthSnapshot {
  return {
    status: health.status,
    version: health.version,
    uptimeSeconds: health.uptime_seconds,
    enginesLoaded: health.engines_loaded,
    workflowsLoaded: health.workflows_loaded,
    fetchedAt,
  };
}

function toUserProfile(
  profile: UserProfileResponse,
  fetchedAt: string,
): UserProfileSnapshot {
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    tier: profile.tier,
    consciousnessLevel: profile.consciousness_level,
    experiencePoints: profile.experience_points,
    birthDate: profile.birth_date ?? undefined,
    birthTime: profile.birth_time ?? undefined,
    birthLocation: profile.birth_location
      ? {
          latitude: profile.birth_location.lat,
          longitude: profile.birth_location.lng,
          name: profile.birth_location.name ?? undefined,
        }
      : undefined,
    timezone: profile.timezone ?? undefined,
    preferences: profile.preferences ?? {},
    fetchedAt,
  };
}

function toUsageSnapshot(
  usage: UserUsageResponse,
  fetchedAt: string,
): UsageSnapshot {
  return {
    userId: usage.user_id,
    daily: usage.daily,
    monthly: usage.monthly,
    engineBreakdown: usage.engine_breakdown.map((entry) => ({
      engineId: entry.engine_id,
      requestCount: entry.request_count,
    })),
    fetchedAt,
  };
}

function toWorkflowSummary(
  workflow: StatusWorkflowResponse,
  info: WorkflowInfoResponse | undefined,
  fetchedAt: string,
): WorkflowSummary {
  return {
    id: workflow.id,
    name: info?.name ?? workflow.name,
    description: info?.description ?? workflow.description,
    engineCount: workflow.engine_count,
    engineIds: info?.engine_ids ?? [],
    fetchedAt,
  };
}

function toEngineSummary(
  engineId: string,
  info: EngineInfoResponse | undefined,
  fetchedAt: string,
): EngineSummary {
  return {
    id: engineId,
    name: info?.engine_name ?? humanizeIdentifier(engineId),
    requiredPhase: info?.required_phase ?? 0,
    fetchedAt,
  };
}

function toReadingSummaries(
  response: ReadingsListResponse,
  fetchedAt: string,
): ReadingSummary[] {
  return response.readings.map((reading) => ({
    id: reading.id,
    engineId: reading.engine_id,
    workflowId: reading.workflow_id ?? undefined,
    inputHash: reading.input_hash,
    witnessPrompt: reading.witness_prompt ?? undefined,
    consciousnessLevel: reading.consciousness_level,
    calculationTimeMs: reading.calculation_time_ms ?? undefined,
    createdAt: reading.created_at,
    payload: reading as Record<string, unknown>,
    fetchedAt,
  }));
}

function toReadingStats(
  response: ReadingsStatsResponse,
  fetchedAt: string,
): ReadingStat[] {
  return response.stats.map((entry) => ({
    engineId: entry.engine_id,
    count: entry.count,
    fetchedAt,
  }));
}

function toEngineExecutionResult(
  payload: Record<string, unknown>,
): EngineExecutionResult {
  return {
    engineId: readString(payload, "engine_id") ?? "unknown-engine",
    result: (payload.result as Record<string, unknown> | undefined) ?? {},
    witnessPrompt: readString(payload, "witness_prompt"),
    consciousnessLevel: readNumber(payload, "consciousness_level"),
    metadata: asRecord(payload.metadata),
    timestamp: readString(payload, "timestamp"),
    raw: payload,
  };
}

function toWorkflowExecutionResult(
  payload: Record<string, unknown>,
): WorkflowExecutionResult {
  const rawOutputs = asRecord(payload.engine_outputs);
  const engineOutputs = Object.fromEntries(
    Object.entries(rawOutputs).map(([engineId, value]) => [
      engineId,
      toEngineExecutionResult({
        engine_id: engineId,
        ...(asRecord(value) ?? {}),
      }),
    ]),
  );

  return {
    workflowId: readString(payload, "workflow_id") ?? "unknown-workflow",
    engineOutputs,
    synthesis: asRecord(payload.synthesis),
    totalTimeMs: readNumber(payload, "total_time_ms"),
    timestamp: readString(payload, "timestamp"),
    raw: payload,
  };
}

function toExecutionRequest(
  input: EngineExecutionInput,
): Record<string, unknown> {
  const request: Record<string, unknown> = {};

  if (
    input.birthData &&
    Object.values(input.birthData).some(
      (value) => value !== undefined && value !== "",
    )
  ) {
    request.birth_data = {
      ...(input.birthData.name ? { name: input.birthData.name } : {}),
      ...(input.birthData.date ? { date: input.birthData.date } : {}),
      ...(input.birthData.time ? { time: input.birthData.time } : {}),
      ...(typeof input.birthData.latitude === "number"
        ? { latitude: input.birthData.latitude }
        : {}),
      ...(typeof input.birthData.longitude === "number"
        ? { longitude: input.birthData.longitude }
        : {}),
      ...(input.birthData.timezone
        ? { timezone: input.birthData.timezone }
        : {}),
    };
  }

  if (input.currentTime) {
    request.current_time = input.currentTime;
  }

  if (input.precision) {
    request.precision = input.precision;
  }

  if (input.options && Object.keys(input.options).length > 0) {
    request.options = input.options;
  }

  return request;
}

function toUserProfileRequest(
  update: UserProfileUpdate,
): Record<string, unknown> {
  const request: Record<string, unknown> = {};

  if (update.fullName !== undefined) {
    request.full_name = update.fullName;
  }

  if (update.email !== undefined) {
    request.email = update.email;
  }

  if (update.birthDate !== undefined) {
    request.birth_date = update.birthDate;
  }

  if (update.birthTime !== undefined) {
    request.birth_time = update.birthTime;
  }

  if (update.birthLocation?.latitude !== undefined) {
    request.birth_location_lat = update.birthLocation.latitude;
  }

  if (update.birthLocation?.longitude !== undefined) {
    request.birth_location_lng = update.birthLocation.longitude;
  }

  if (update.birthLocation?.name !== undefined) {
    request.birth_location_name = update.birthLocation.name;
  }

  if (update.timezone !== undefined) {
    request.timezone = update.timezone;
  }

  if (update.preferences !== undefined) {
    request.preferences = update.preferences;
  }

  return request;
}

function toNumber(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readString(
  payload: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readNumber(
  payload: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function humanizeIdentifier(value: string): string {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function optionalRequest<T>(
  request: () => Promise<T>,
): Promise<T | undefined> {
  try {
    return await request();
  } catch {
    return undefined;
  }
}
