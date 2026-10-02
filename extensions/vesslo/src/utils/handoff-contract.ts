import { posix } from "path";

export const HANDOFF_MAX_TARGETS = 16;
export const HANDOFF_MAX_PAYLOAD_BYTES = 24 * 1024;
export const HANDOFF_MAX_URL_BYTES = 32 * 1024;
export const HANDOFF_REQUEST_LIFETIME_MS = 120 * 1000;
export const HANDOFF_FUTURE_TOLERANCE_MS = 30 * 1000;

export interface HandoffTarget {
  appId: string;
  bundleId: string;
  canonicalPath: string;
  caskToken: string;
  installedVersion: string;
  expectedTargetVersion: string;
  readinessEvidenceId?: string;
}

export interface HandoffRequest {
  schemaVersion: 1 | 2;
  requestId: string;
  publisherSessionId: string;
  createdAt: string;
  inventoryRevision: number;
  completedCheckRevision: number;
  source: "homebrew";
  targets: HandoffTarget[];
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isHandoffUUID(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value)
  );
}

export function isHandoffISODate(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 64) return false;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(
      value,
    );
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const calendar = new Date(0);
  calendar.setUTCFullYear(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return (
    calendar.getUTCFullYear() === Number(match[1]) &&
    calendar.getUTCMonth() === Number(match[2]) - 1 &&
    calendar.getUTCDate() === Number(match[3])
  );
}

function boundedIdentity(value: unknown): value is string {
  // Foundation CharacterSet.controlCharacters includes both control and format scalars.
  return (
    typeof value === "string" &&
    value.length > 0 &&
    Buffer.byteLength(value, "utf8") <= 4096 &&
    !/[\p{Cc}\p{Cf}\uD800-\uDFFF]/u.test(value)
  );
}

export function isCanonicalHandoffPath(value: unknown): value is string {
  return (
    boundedIdentity(value) &&
    value.startsWith("/") &&
    value.endsWith(".app") &&
    posix.normalize(value) === value
  );
}

export function isCanonicalHandoffCask(value: unknown): value is string {
  return (
    boundedIdentity(value) &&
    /^[a-z0-9][a-z0-9@._+-]*(\/[a-z0-9][a-z0-9@._+-]*){0,2}$/.test(value) &&
    !value.endsWith(".app")
  );
}

export function parseHandoffTarget(value: unknown): HandoffTarget | null {
  if (
    !record(value) ||
    !isHandoffUUID(value.appId) ||
    !boundedIdentity(value.bundleId) ||
    !isCanonicalHandoffPath(value.canonicalPath) ||
    !isCanonicalHandoffCask(value.caskToken) ||
    !boundedIdentity(value.installedVersion) ||
    !boundedIdentity(value.expectedTargetVersion) ||
    (value.readinessEvidenceId != null &&
      !isHandoffUUID(value.readinessEvidenceId))
  )
    return null;
  return {
    appId: value.appId,
    bundleId: value.bundleId,
    canonicalPath: value.canonicalPath,
    caskToken: value.caskToken,
    installedVersion: value.installedVersion,
    expectedTargetVersion: value.expectedTargetVersion,
    ...(typeof value.readinessEvidenceId === "string"
      ? { readinessEvidenceId: value.readinessEvidenceId }
      : {}),
  };
}

function revision(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/** Historical receipt requests remain parseable after their 120-second admission lifetime. */
export function parseHandoffRequest(value: unknown): HandoffRequest | null {
  if (
    !record(value) ||
    (value.schemaVersion !== 1 && value.schemaVersion !== 2) ||
    value.source !== "homebrew" ||
    !isHandoffUUID(value.requestId) ||
    !isHandoffUUID(value.publisherSessionId) ||
    !isHandoffISODate(value.createdAt) ||
    !revision(value.inventoryRevision) ||
    !revision(value.completedCheckRevision) ||
    !Array.isArray(value.targets) ||
    value.targets.length < 1 ||
    value.targets.length > HANDOFF_MAX_TARGETS
  )
    return null;
  const targets: HandoffTarget[] = [];
  for (const valueTarget of value.targets) {
    const target = parseHandoffTarget(valueTarget);
    if (
      !target ||
      (value.schemaVersion === 2 && !target.readinessEvidenceId) ||
      (value.schemaVersion === 1 && target.readinessEvidenceId !== undefined)
    )
      return null;
    targets.push(target);
  }
  const request: HandoffRequest = {
    schemaVersion: value.schemaVersion,
    requestId: value.requestId,
    publisherSessionId: value.publisherSessionId,
    createdAt: value.createdAt,
    inventoryRevision: value.inventoryRevision,
    completedCheckRevision: value.completedCheckRevision,
    source: "homebrew",
    targets,
  };
  return Buffer.byteLength(JSON.stringify(request), "utf8") <=
    HANDOFF_MAX_PAYLOAD_BYTES
    ? request
    : null;
}

export function handoffRequestReason(
  request: HandoffRequest,
  now: number,
): string | null {
  if (!parseHandoffRequest(request) || !Number.isFinite(now))
    return "malformed";
  const age = now - Date.parse(request.createdAt);
  if (age < -HANDOFF_FUTURE_TOLERANCE_MS) return "futureRequest";
  if (age > HANDOFF_REQUEST_LIFETIME_MS) return "expired";
  if (
    new Set(request.targets.map((target) => target.appId.toLowerCase()))
      .size !== request.targets.length ||
    new Set(request.targets.map((target) => target.canonicalPath)).size !==
      request.targets.length ||
    new Set(request.targets.map((target) => target.caskToken)).size !==
      request.targets.length ||
    (request.schemaVersion === 2 &&
      new Set(
        request.targets.map((target) =>
          target.readinessEvidenceId?.toLowerCase(),
        ),
      ).size !== request.targets.length)
  )
    return "duplicate";
  return null;
}

export function buildHomebrewReviewURL(request: HandoffRequest): string {
  const parsed = parseHandoffRequest(request);
  if (!parsed)
    throw new Error(
      "The review request has invalid or oversized identity fields.",
    );
  const data = Buffer.from(JSON.stringify(parsed), "utf8");
  const url = `vesslo://review-homebrew/v${parsed.schemaVersion}?payload=${data.toString("base64url")}`;
  if (url.length > HANDOFF_MAX_URL_BYTES)
    throw new Error(
      "The selected targets exceed Vesslo's review URL size limit.",
    );
  return url;
}

export function parseHomebrewReviewURL(url: unknown): HandoffRequest | null {
  if (
    typeof url !== "string" ||
    Buffer.byteLength(url, "utf8") > HANDOFF_MAX_URL_BYTES
  )
    return null;
  const match =
    /^vesslo:\/\/review-homebrew\/v([12])\?payload=([A-Za-z0-9_-]+)$/.exec(url);
  if (!match) return null;
  const data = Buffer.from(match[2], "base64url");
  // Node's base64 decoder is permissive; the transport accepts only canonical unpadded encoding.
  if (
    data.length > HANDOFF_MAX_PAYLOAD_BYTES ||
    data.toString("base64url") !== match[2]
  )
    return null;
  try {
    const text = data.toString("utf8");
    if (!Buffer.from(text, "utf8").equals(data)) return null;
    const request = parseHandoffRequest(JSON.parse(text));
    return request?.schemaVersion === Number(match[1]) ? request : null;
  } catch {
    return null;
  }
}
