import {
  ExecutionRouteInfo,
  ExecutionRouteTarget,
  EngineExecutionInput,
  EngineExecutionResult,
  EngineSummary,
  HealthSnapshot,
  RateLimitInfo,
  ReadingStat,
  ReadingSummary,
  RemoteSnapshot,
  SelemeneClientConfig,
  TarotExecutionOptions,
  TarotSpreadVariant,
  SyncIssue,
  UsageSnapshot,
  UserProfileSnapshot,
  UserProfileUpdate,
  UserProfileUpdateResult,
  WorkflowExecutionResult,
  WorkflowSummary,
} from "./types";
import { describeTarget, JsonRequestError, requestJson } from "./http";
import { getExecutionRoutePreference } from "./settings";
import { getWitnessUrl } from "./witness-api";
import { normalizeBaseUrl } from "./urls";

async function resolveExecutionRoute(
  config: SelemeneClientConfig,
): Promise<ExecutionRouteInfo> {
  const target = getExecutionRoutePreference();

  if (target === "witness") {
    const witnessUrl = await getWitnessUrl();
    return {
      target,
      label: "Witness Gateway",
      baseUrl: witnessUrl,
    };
  }

  return {
    target: "selemene",
    label: "Selemene Direct",
    baseUrl: normalizeBaseUrl(config.baseUrl),
  };
}

async function calculateEngineViaWitness(
  route: ExecutionRouteInfo,
  engineId: string,
  input: EngineExecutionInput,
  fetchImpl: typeof fetch = fetch,
): Promise<EngineExecutionResult> {
  try {
    const response = await requestJson<Record<string, unknown>>({
      target: "witness",
      baseUrl: route.baseUrl,
      path: `/api/v1/engines/${engineId}/calculate`,
      method: "POST",
      body: JSON.stringify(toExecutionRequest(input)),
      fetchImpl,
    });
    return toEngineExecutionResult(response.payload, route);
  } catch (error) {
    throw normalizeExecutionError(error, "witness");
  }
}

async function executeWorkflowViaWitness(
  route: ExecutionRouteInfo,
  workflowId: string,
  input: EngineExecutionInput,
  fetchImpl: typeof fetch = fetch,
): Promise<WorkflowExecutionResult> {
  try {
    const response = await requestJson<Record<string, unknown>>({
      target: "witness",
      baseUrl: route.baseUrl,
      path: `/api/v1/workflows/${workflowId}/execute`,
      method: "POST",
      body: JSON.stringify(toExecutionRequest(input)),
      fetchImpl,
    });
    return toWorkflowExecutionResult(response.payload, route);
  } catch (error) {
    throw normalizeExecutionError(error, "witness");
  }
}

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
  includeRawPayloads?: boolean;
  readingLimit?: number;
  usageEngineLimit?: number;
  fetchImpl?: typeof fetch;
}

interface OptionalRequestResult<T> {
  value?: T;
  issue?: SyncIssue;
}

export { normalizeBaseUrl } from "./urls";

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
  const syncIssues: SyncIssue[] = [];

  const includeService = options.includeService ?? true;
  const includeCatalog = options.includeCatalog ?? true;
  const includeProfile = options.includeProfile ?? true;
  const includeUsage = options.includeUsage ?? true;
  const includeReadings = options.includeReadings ?? true;
  const includeRawPayloads = options.includeRawPayloads ?? false;
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
          const info = await optionalRequest(
            `workflow ${workflow.id} info`,
            "selemene",
            () => client.getWorkflowInfo(workflow.id),
          );
          if (info.issue) {
            syncIssues.push(info.issue);
          }
          return toWorkflowSummary(workflow, info.value, fetchedAt);
        }),
      );

      const engineInfos = await Promise.all(
        statusResponse.engines.map(async (engineId) => {
          const info = await optionalRequest(
            `engine ${engineId} info`,
            "selemene",
            () => client.getEngineInfo(engineId),
          );
          if (info.issue) {
            syncIssues.push(info.issue);
          }
          return toEngineSummary(engineId, info.value, fetchedAt);
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
      ? optionalRequest("profile", "selemene", () => client.getUserProfile())
      : Promise.resolve<OptionalRequestResult<UserProfileResponse>>({}),
    includeUsage
      ? optionalRequest("usage", "selemene", () =>
          client.getUserUsage(usageEngineLimit),
        )
      : Promise.resolve<OptionalRequestResult<UserUsageResponse>>({}),
    includeReadings
      ? optionalRequest("readings", "selemene", () =>
          client.getReadings({ limit: readingLimit, offset: 0 }),
        )
      : Promise.resolve<OptionalRequestResult<ReadingsListResponse>>({}),
    includeReadings
      ? optionalRequest("reading stats", "selemene", () =>
          client.getReadingStats(),
        )
      : Promise.resolve<OptionalRequestResult<ReadingsStatsResponse>>({}),
  ]);

  syncIssues.push(
    ...([
      profileResponse.issue,
      usageResponse.issue,
      readingsResponse.issue,
      readingStatsResponse.issue,
    ].filter(Boolean) as SyncIssue[]),
  );

  return {
    baseUrl: normalizeBaseUrl(config.baseUrl),
    health,
    profile: profileResponse.value
      ? toUserProfile(profileResponse.value, fetchedAt)
      : undefined,
    usage: usageResponse.value
      ? toUsageSnapshot(usageResponse.value, fetchedAt)
      : undefined,
    workflows,
    engines,
    readings: readingsResponse.value
      ? toReadingSummaries(
          readingsResponse.value,
          fetchedAt,
          includeRawPayloads,
        )
      : undefined,
    readingStats: readingStatsResponse.value
      ? toReadingStats(readingStatsResponse.value, fetchedAt)
      : undefined,
    rateLimit: client.rateLimitInfo,
    syncIssues,
    fetchedAt,
  };
}

export async function calculateEngine(
  config: SelemeneClientConfig,
  engineId: string,
  input: EngineExecutionInput,
  fetchImpl: typeof fetch = fetch,
): Promise<EngineExecutionResult> {
  const route = await resolveExecutionRoute(config);
  if (route.target === "witness") {
    return calculateEngineViaWitness(route, engineId, input, fetchImpl);
  }

  const client = new SelemeneApiClient(config, fetchImpl);
  const response = await client.calculateEngine(engineId, input);
  return toEngineExecutionResult(response, route);
}

export function withTarotExecutionOptions(
  input: EngineExecutionInput,
  tarot: TarotExecutionOptions,
): EngineExecutionInput {
  const nextOptions: Record<string, unknown> = {
    ...(input.options ?? {}),
  };

  if (tarot.question?.trim()) {
    nextOptions.question = tarot.question.trim();
  }

  if (tarot.spread) {
    nextOptions.spread = normalizeTarotSpreadVariant(tarot.spread);
  }

  return {
    ...input,
    options: nextOptions,
  };
}

export async function calculateTarot(
  config: SelemeneClientConfig,
  input: EngineExecutionInput,
  tarot: TarotExecutionOptions,
  fetchImpl: typeof fetch = fetch,
): Promise<EngineExecutionResult> {
  return calculateEngine(
    config,
    "tarot",
    withTarotExecutionOptions(input, tarot),
    fetchImpl,
  );
}

export async function executeWorkflow(
  config: SelemeneClientConfig,
  workflowId: string,
  input: EngineExecutionInput,
  fetchImpl: typeof fetch = fetch,
): Promise<WorkflowExecutionResult> {
  const route = await resolveExecutionRoute(config);
  if (route.target === "witness") {
    return executeWorkflowViaWitness(route, workflowId, input, fetchImpl);
  }

  const client = new SelemeneApiClient(config, fetchImpl);
  const response = await client.executeWorkflow(workflowId, input);
  return toWorkflowExecutionResult(response, route);
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
    try {
      const response = await requestJson<T>({
        target: "selemene",
        baseUrl: this.baseUrl,
        path,
        method: init.method ?? "GET",
        headers: init.headers,
        body: typeof init.body === "string" ? init.body : undefined,
        authHeader:
          context.auth === false
            ? undefined
            : {
                name: "X-API-Key",
                value: this.apiKey,
              },
        fetchImpl: this.fetchImpl,
      });
      this.captureRateLimit(response.headers);
      return response.payload;
    } catch (error) {
      throw normalizeSelemeneError(error);
    }
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
  bodyText?: string,
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

  return (
    payload.error ??
    `Selemene request failed with status ${status}${bodyText ? `: ${truncateBodyText(bodyText)}` : "."}`
  );
}

function buildWitnessErrorMessage(
  status: number,
  payload: ApiErrorResponse,
  bodyText?: string,
): string {
  if (status === 401 || status === 403) {
    return (
      payload.error ??
      "Witness gateway rejected the request. Check the selected route and gateway configuration."
    );
  }

  if (status === 404) {
    return payload.error ?? "Witness gateway resource was not found.";
  }

  if (status === 429) {
    return "Witness gateway rate limit exceeded. Try again after the limit resets.";
  }

  return (
    payload.error ??
    `Witness gateway request failed with status ${status}${bodyText ? `: ${truncateBodyText(bodyText)}` : "."}`
  );
}

function normalizeSelemeneError(error: unknown): Error {
  if (!(error instanceof JsonRequestError)) {
    return error instanceof Error ? error : new Error("Unknown Selemene error");
  }

  switch (error.kind) {
    case "timeout":
      return new Error("Selemene request timed out. Try again in a moment.");
    case "network":
      return new Error(error.message);
    case "parse":
      return new Error(
        "Selemene returned an unreadable response. Check the backend or gateway for malformed JSON.",
      );
    case "http":
    default:
      return new Error(
        buildApiErrorMessage(
          error.status ?? 500,
          toApiErrorResponse(error.payload),
          error.bodyText,
        ),
      );
  }
}

function normalizeExecutionError(
  error: unknown,
  target: ExecutionRouteTarget,
): Error {
  if (target === "selemene") {
    return normalizeSelemeneError(error);
  }

  if (!(error instanceof JsonRequestError)) {
    return error instanceof Error ? error : new Error("Unknown Witness error");
  }

  switch (error.kind) {
    case "timeout":
      return new Error(
        "Witness gateway request timed out. Try again in a moment.",
      );
    case "network":
      return new Error(error.message);
    case "parse":
      return new Error(
        "Witness gateway returned an unreadable response. Check the gateway for malformed JSON.",
      );
    case "http":
    default:
      return new Error(
        buildWitnessErrorMessage(
          error.status ?? 500,
          toApiErrorResponse(error.payload),
          error.bodyText,
        ),
      );
  }
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
  includeRawPayloads: boolean,
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
    payload: toCachedReadingPayload(reading, includeRawPayloads),
    fetchedAt,
  }));
}

function toCachedReadingPayload(
  reading: ReadingsListResponse["readings"][number],
  includeRawPayloads: boolean,
): Record<string, unknown> {
  if (includeRawPayloads) {
    return reading as Record<string, unknown>;
  }

  const resultData =
    reading.result_data && typeof reading.result_data === "object"
      ? reading.result_data
      : reading.result_data !== undefined
        ? { value: reading.result_data }
        : undefined;
  const payload: Record<string, unknown> = {
    engine_id: reading.engine_id,
    ...(reading.witness_prompt
      ? { witness_prompt: reading.witness_prompt }
      : {}),
    ...(typeof reading.consciousness_level === "number"
      ? { consciousness_level: reading.consciousness_level }
      : {}),
    ...(reading.created_at ? { timestamp: reading.created_at } : {}),
    ...(reading.calculation_time_ms !== undefined
      ? {
          metadata: {
            calculation_time_ms: reading.calculation_time_ms,
          },
        }
      : {}),
    ...(resultData ? { result: asRecord(resultData) } : {}),
  };

  return payload;
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
  route?: ExecutionRouteInfo,
): EngineExecutionResult {
  const witnessLayer = asRecord(payload.witness_layer);
  const witnessPrompt =
    readString(payload, "witness_prompt") ??
    readString(witnessLayer, "witness_question");

  return {
    engineId: readString(payload, "engine_id") ?? "unknown-engine",
    result: (payload.result as Record<string, unknown> | undefined) ?? {},
    witnessPrompt,
    consciousnessLevel: readNumber(payload, "consciousness_level"),
    metadata: asRecord(payload.metadata),
    timestamp: readString(payload, "timestamp"),
    route,
    raw: payload,
  };
}

function toWorkflowExecutionResult(
  payload: Record<string, unknown>,
  route?: ExecutionRouteInfo,
): WorkflowExecutionResult {
  const rawOutputs =
    withEngineOutputsRecord(asRecord(payload.engine_outputs)) ??
    withEngineOutputsRecord(asRecord(payload.engine_results)) ??
    {};
  const engineOutputs = Object.fromEntries(
    Object.entries(rawOutputs).map(([engineId, value]) => [
      engineId,
      toEngineExecutionResult(
        {
          engine_id: engineId,
          ...(asRecord(value) ?? {}),
        },
        route,
      ),
    ]),
  );

  return {
    workflowId: readString(payload, "workflow_id") ?? "unknown-workflow",
    engineOutputs,
    synthesis: {
      ...asRecord(payload.synthesis),
      ...("witness_layer" in payload
        ? { witness_layer: asRecord(payload.witness_layer) }
        : {}),
    },
    totalTimeMs: readNumber(payload, "total_time_ms"),
    timestamp: readString(payload, "timestamp"),
    route,
    raw: payload,
  };
}

function withEngineOutputsRecord(
  value: Record<string, unknown>,
): Record<string, unknown> | undefined {
  return Object.keys(value).length > 0 ? value : undefined;
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

function normalizeTarotSpreadVariant(
  spread: TarotSpreadVariant,
): TarotSpreadVariant {
  switch (spread) {
    case "single_card":
    case "three_card":
    case "celtic_cross":
    case "horseshoe":
    case "relationship":
    case "career":
    case "yes_no":
      return spread;
    default:
      return "three_card";
  }
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

function toApiErrorResponse(value: unknown): ApiErrorResponse {
  return asRecord(value) as ApiErrorResponse;
}

function humanizeIdentifier(value: string): string {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function truncateBodyText(value?: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.length > 160 ? `${trimmed.slice(0, 157)}...` : trimmed;
}

async function optionalRequest<T>(
  resource: string,
  target: ExecutionRouteTarget,
  request: () => Promise<T>,
): Promise<OptionalRequestResult<T>> {
  try {
    return { value: await request() };
  } catch (error) {
    return {
      issue: {
        resource,
        target,
        message:
          error instanceof Error
            ? error.message
            : `Unable to refresh ${resource} from ${describeTarget(target)}.`,
      },
    };
  }
}
