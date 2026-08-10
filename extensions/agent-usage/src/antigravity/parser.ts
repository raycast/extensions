import {
  AntigravityError,
  AntigravityModelQuota,
  AntigravityQuotaBucket,
  AntigravityQuotaGroup,
  AntigravityUsage,
} from "./types";
import { formatResetTime, parseDate } from "../agents/format";

interface ParseResult {
  usage: AntigravityUsage | null;
  error: AntigravityError | null;
}

export function parseAntigravityUserStatusResponse(raw: unknown, quotaSummaryRaw?: unknown): ParseResult {
  const body = asRecord(raw);
  if (!body) {
    return parseError("Invalid API response format");
  }

  const codeError = codeToError(body.code);
  if (codeError) {
    return { usage: null, error: { type: "api_error", message: codeError } };
  }

  const userStatus = asRecord(body.userStatus);
  if (!userStatus) {
    return parseError("Missing userStatus");
  }

  const modelConfigs = getModelConfigsFromUserStatus(userStatus);
  const models = modelConfigs.map(quotaFromConfig).filter((model): model is AntigravityModelQuota => model !== null);
  const parsedQuotaGroups = quotaSummaryRaw ? parseQuotaGroups(quotaSummaryRaw) : [];

  if (models.length === 0 && parsedQuotaGroups.length === 0) {
    return parseError("No quota models available");
  }

  const ordered = selectDisplayModels(models);
  const quotaGroups = parsedQuotaGroups.length > 0 ? parsedQuotaGroups : undefined;

  const usage: AntigravityUsage = {
    accountEmail: toNullableString(userStatus.email),
    accountPlan: extractPreferredPlanName(userStatus),
    models,
    primaryModel: ordered[0] ?? null,
    secondaryModel: ordered[1] ?? null,
    tertiaryModel: ordered[2] ?? null,
    quotaGroups,
  };

  return { usage, error: null };
}

export function parseAntigravityCommandModelConfigsResponse(raw: unknown): ParseResult {
  const body = asRecord(raw);
  if (!body) {
    return parseError("Invalid API response format");
  }

  const codeError = codeToError(body.code);
  if (codeError) {
    return { usage: null, error: { type: "api_error", message: codeError } };
  }

  const configs = asArray(body.clientModelConfigs);
  const models = configs.map(quotaFromConfig).filter((model): model is AntigravityModelQuota => model !== null);

  if (models.length === 0) {
    return parseError("No quota models available");
  }

  const ordered = selectDisplayModels(models);

  return {
    usage: {
      accountEmail: null,
      accountPlan: null,
      models,
      primaryModel: ordered[0] ?? null,
      secondaryModel: ordered[1] ?? null,
      tertiaryModel: ordered[2] ?? null,
    },
    error: null,
  };
}

export function selectDisplayModels(models: AntigravityModelQuota[]): AntigravityModelQuota[] {
  const ordered: AntigravityModelQuota[] = [];

  const addIfUnique = (model: AntigravityModelQuota | undefined) => {
    if (model && !ordered.some((m) => m.modelId === model.modelId)) {
      ordered.push(model);
    }
  };

  // 1. Google Gemini Pro models
  const geminiPro =
    models.find((model) => isGeminiProHigh(model.label)) ?? models.find((model) => isGeminiPro(model.label));
  addIfUnique(geminiPro);

  // 2. Google Gemini Flash models
  const geminiFlash = models.find((model) => isGeminiFlash(model.label));
  addIfUnique(geminiFlash);

  // 3. Non-Google / Anthropic Claude models
  const claudePrimary =
    models.find((model) => isClaudeOpus(model.label)) ??
    models.find((model) => isClaudeSonnet(model.label)) ??
    models.find((model) => isClaudeAny(model.label));
  addIfUnique(claudePrimary);

  // 4. Fill remaining slots up to 3 with any other models, sorted by percentLeft ascending
  const remaining = [...models]
    .filter((model) => !ordered.some((m) => m.modelId === model.modelId))
    .sort((a, b) => a.percentLeft - b.percentLeft);

  for (const model of remaining) {
    if (ordered.length >= 3) break;
    addIfUnique(model);
  }

  return ordered;
}

function quotaFromConfig(rawConfig: unknown): AntigravityModelQuota | null {
  const config = asRecord(rawConfig);
  if (!config) return null;

  const quotaInfo = asRecord(config.quotaInfo);
  if (!quotaInfo) return null;

  const label = toStringOr(config.label, "Unknown model");
  const modelId = toModelId(config);
  const remainingFraction = toNumber(quotaInfo.remainingFraction);
  const resetAtRaw = toNullableString(quotaInfo.resetTime);
  const resetAt = parseDate(resetAtRaw ?? "")?.toISOString() ?? null;

  const percentLeft = remainingFraction !== null ? clamp(Math.round(remainingFraction * 100), 0, 100) : 0;

  return {
    label,
    modelId,
    percentLeft,
    resetsIn: formatResetTime(resetAtRaw),
    resetAt,
  };
}

function getModelConfigsFromUserStatus(userStatus: Record<string, unknown>): unknown[] {
  const cascade = asRecord(userStatus.cascadeModelConfigData);
  return asArray(cascade?.clientModelConfigs);
}

function extractPreferredPlanName(userStatus: Record<string, unknown>): string | null {
  const planStatus = asRecord(userStatus.planStatus);
  const planInfo = asRecord(planStatus?.planInfo);
  if (!planInfo) return null;

  const candidates = [
    toNullableString(planInfo.planDisplayName),
    toNullableString(planInfo.displayName),
    toNullableString(planInfo.productName),
    toNullableString(planInfo.planName),
    toNullableString(planInfo.planShortName),
  ];

  return candidates.find((value) => !!value) ?? null;
}

function toModelId(config: Record<string, unknown>): string {
  const alias = asRecord(config.modelOrAlias);
  return toStringOr(alias?.model, toStringOr(config.label, "unknown"));
}

function isClaudeOpus(label: string): boolean {
  const lower = label.toLowerCase();
  return lower.includes("claude") && lower.includes("opus");
}

function isClaudeSonnet(label: string): boolean {
  const lower = label.toLowerCase();
  return lower.includes("claude") && lower.includes("sonnet") && !lower.includes("thinking");
}

function isGeminiProHigh(label: string): boolean {
  const lower = label.toLowerCase();
  return lower.includes("gemini") && lower.includes("pro") && lower.includes("high");
}

function isGeminiFlash(label: string): boolean {
  const lower = label.toLowerCase();
  return lower.includes("gemini") && lower.includes("flash");
}
function isClaudeAny(label: string): boolean {
  const lower = label.toLowerCase();
  return lower.includes("claude");
}

function isGeminiPro(label: string): boolean {
  const lower = label.toLowerCase();
  return lower.includes("gemini") && lower.includes("pro");
}
function codeToError(code: unknown): string | null {
  if (code === null || code === undefined) {
    return null;
  }

  if (typeof code === "number") {
    return code === 0 ? null : `${code}`;
  }

  if (typeof code === "string") {
    const normalized = code.toLowerCase();
    if (normalized === "ok" || normalized === "success" || normalized === "0") {
      return null;
    }
    return code;
  }

  return "Unknown code";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toStringOr(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseError(message: string): ParseResult {
  return {
    usage: null,
    error: {
      type: "parse_error",
      message,
    },
  };
}

function parseQuotaGroups(raw: unknown): AntigravityQuotaGroup[] {
  const body = asRecord(raw);
  const response = asRecord(body?.response);
  if (!response) return [];

  const groups = asArray(response.groups);
  return groups
    .map((g): AntigravityQuotaGroup | null => {
      const groupRecord = asRecord(g);
      if (!groupRecord) return null;

      const displayName = toStringOr(groupRecord?.displayName, "Unknown group");
      const description = toNullableString(groupRecord?.description) ?? undefined;
      const buckets = asArray(groupRecord?.buckets)
        .map(parseQuotaBucket)
        .filter((bucket): bucket is AntigravityQuotaBucket => bucket !== null);

      if (buckets.length === 0) return null;

      return {
        displayName,
        description,
        buckets,
      };
    })
    .filter((group): group is AntigravityQuotaGroup => group !== null);
}

function parseQuotaBucket(raw: unknown): AntigravityQuotaBucket | null {
  const bucketRecord = asRecord(raw);
  if (!bucketRecord) return null;

  const remainingFraction = toNumber(bucketRecord.remainingFraction);
  if (remainingFraction === null) return null;

  const resetTimeRaw = toNullableString(bucketRecord.resetTime);

  return {
    bucketId: toStringOr(bucketRecord.bucketId, "unknown"),
    displayName: toStringOr(bucketRecord.displayName, "Limit"),
    description: toNullableString(bucketRecord.description) ?? undefined,
    window: toStringOr(bucketRecord.window, "unknown"),
    percentLeft: clamp(Math.round(remainingFraction * 100), 0, 100),
    resetsIn: formatResetTime(resetTimeRaw),
    resetAt: parseDate(resetTimeRaw ?? "")?.toISOString() ?? null,
  };
}
