import { homedir } from "os";
import { join } from "path";
import {
  ELIGIBILITY_KINDS,
  ExportCheckPhase,
  HomebrewReadinessEvidence,
  PRIMARY_ACTION_KINDS,
  VessloApp,
  VessloData,
} from "../types";
import { classifyExportContract } from "./app-policy";
import { validISO8601Timestamp } from "./data-state";
import { isHandoffUUID, parseHandoffTarget } from "./handoff-contract";

export const MAX_EXPORT_BYTES = 64 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTROL = /[\p{Cc}\p{Cf}]/u;

function has(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

export const DATA_PATH = join(
  homedir(),
  "Library",
  "Application Support",
  "Vesslo",
  "raycast_data.json",
);

export class MalformedVessloDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MalformedVessloDataError";
  }
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function booleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function knownKind<T extends string>(
  value: unknown,
  kinds: readonly T[],
  exact = false,
): T | "unknown" | null {
  const raw = exact && typeof value === "string" ? value : stringOrNull(value);
  if (raw === null) return null;
  return kinds.find((kind) => kind === raw) ?? "unknown";
}

function contractString(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.trim() !== value ||
    CONTROL.test(value) ||
    Buffer.byteLength(value, "utf8") > 4096
  ) {
    throw new MalformedVessloDataError(
      `Vesslo versioned export has an invalid ${field}.`,
    );
  }
  return value;
}

function optionalIdentity(value: unknown, field: string): string | null {
  return value === undefined || value === null
    ? null
    : contractString(value, field);
}

function revision(
  record: Record<string, unknown>,
  key: string,
  optional = false,
): number | undefined {
  if (optional && !has(record, key)) return undefined;
  const value = record[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new MalformedVessloDataError(
      `Vesslo versioned export has an invalid ${key}.`,
    );
  return value;
}

function versionedMetadata(
  record: Record<string, unknown>,
): Partial<VessloData> {
  const producerVersion = contractString(
    record.producerVersion,
    "producerVersion",
  );
  const producerBuild = contractString(record.producerBuild, "producerBuild");
  const publisherSessionId = contractString(
    record.publisherSessionId,
    "publisherSessionId",
  );
  if (!UUID.test(publisherSessionId))
    throw new MalformedVessloDataError(
      "Vesslo versioned export has an invalid publisher session UUID.",
    );
  const inventoryRevision = revision(record, "inventoryRevision") as number;
  const exportRevision = revision(record, "exportRevision") as number;
  const checkRevision = revision(record, "checkRevision") as number;
  const completedCheckRevision = revision(
    record,
    "completedCheckRevision",
    true,
  );
  const checkedInventoryRevision = revision(
    record,
    "checkedInventoryRevision",
    true,
  );
  const completedInventoryRevision =
    record.schemaVersion === 3
      ? revision(record, "completedInventoryRevision", true)
      : undefined;
  if (
    !["unverified", "checking", "ready", "failed"].includes(
      record.checkPhase as string,
    )
  )
    throw new MalformedVessloDataError(
      "Vesslo versioned export has an invalid check phase.",
    );
  const checkPhase = record.checkPhase as ExportCheckPhase;
  if (!validISO8601Timestamp(record.exportedAt))
    throw new MalformedVessloDataError(
      "Vesslo versioned export has an invalid export timestamp.",
    );
  const lastUpdateCheckAt = has(record, "lastUpdateCheckAt")
    ? record.lastUpdateCheckAt
    : undefined;
  if (
    lastUpdateCheckAt !== undefined &&
    !validISO8601Timestamp(lastUpdateCheckAt)
  )
    throw new MalformedVessloDataError(
      "Vesslo versioned export has an invalid completed-check timestamp.",
    );
  if (
    (completedCheckRevision === undefined) !==
      (lastUpdateCheckAt === undefined) ||
    (completedCheckRevision !== undefined &&
      (completedCheckRevision === 0 ||
        completedCheckRevision > checkRevision)) ||
    (checkedInventoryRevision !== undefined &&
      checkedInventoryRevision > inventoryRevision) ||
    (checkPhase !== "ready" && checkedInventoryRevision !== undefined) ||
    (checkPhase === "ready" &&
      (checkRevision === 0 ||
        completedCheckRevision !== checkRevision ||
        checkedInventoryRevision !== inventoryRevision))
  )
    throw new MalformedVessloDataError(
      "Vesslo versioned export has inconsistent check completion and inventory revisions.",
    );
  if (
    record.schemaVersion === 3 &&
    ((completedInventoryRevision !== undefined &&
      (completedCheckRevision === undefined ||
        completedInventoryRevision > inventoryRevision)) ||
      (checkPhase === "ready" &&
        completedInventoryRevision !== inventoryRevision))
  )
    throw new MalformedVessloDataError(
      "Vesslo schema 3 has inconsistent completed cohort revisions.",
    );
  if (
    lastUpdateCheckAt !== undefined &&
    Date.parse(lastUpdateCheckAt as string) > Date.parse(record.exportedAt)
  )
    throw new MalformedVessloDataError(
      "Vesslo versioned export completed-check timestamp is newer than its export.",
    );
  if (!Array.isArray(record.capabilities) || record.capabilities.length > 64)
    throw new MalformedVessloDataError(
      "Vesslo versioned export has an invalid capability list.",
    );
  const capabilities = record.capabilities.map((value) =>
    contractString(value, "capability"),
  );
  if (new Set(capabilities).size !== capabilities.length)
    throw new MalformedVessloDataError(
      "Vesslo versioned export has duplicate capabilities.",
    );
  const checkReason = has(record, "checkReason")
    ? contractString(record.checkReason, "checkReason")
    : undefined;
  return {
    schemaVersion: record.schemaVersion as 2 | 3,
    producerVersion,
    producerBuild,
    publisherSessionId,
    inventoryRevision,
    exportRevision,
    checkRevision,
    completedCheckRevision,
    ...(record.schemaVersion === 3 ? { completedInventoryRevision } : {}),
    checkedInventoryRevision,
    checkPhase,
    lastUpdateCheckAt: lastUpdateCheckAt as string | undefined,
    checkReason,
    capabilities,
    ...(record.schemaVersion === 3
      ? { homebrewReadiness: parseHomebrewReadiness(record) }
      : {}),
  };
}

function parseHomebrewReadiness(
  metadata: Record<string, unknown>,
): HomebrewReadinessEvidence[] {
  if (
    !Array.isArray(metadata.homebrewReadiness) ||
    metadata.homebrewReadiness.length > 10000
  )
    throw new MalformedVessloDataError(
      "Vesslo schema 3 has an invalid Homebrew readiness list.",
    );
  const appIds = new Set<string>();
  const evidenceIds = new Set<string>();
  return metadata.homebrewReadiness.map(
    (raw: unknown): HomebrewReadinessEvidence => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw))
        throw new MalformedVessloDataError(
          "Vesslo schema 3 has a malformed Homebrew readiness entry.",
        );
      const entry = raw as Record<string, unknown>;
      const target = parseHandoffTarget(entry.target);
      if (
        !target ||
        has(entry.target as Record<string, unknown>, "readinessEvidenceId") ||
        entry.source !== "homebrew" ||
        !["ready", "failed", "unverified"].includes(entry.state as string) ||
        !isHandoffUUID(entry.publisherSessionId)
      )
        throw new MalformedVessloDataError(
          "Vesslo schema 3 has an invalid Homebrew readiness identity or state.",
        );
      const checkRevision = revision(entry, "checkRevision") as number;
      const inventoryRevision = revision(entry, "inventoryRevision") as number;
      const evidenceId =
        entry.evidenceId == null ? undefined : entry.evidenceId;
      const checkedAt = entry.checkedAt == null ? undefined : entry.checkedAt;
      const expiresAt = entry.expiresAt == null ? undefined : entry.expiresAt;
      const reason =
        entry.reason == null
          ? undefined
          : contractString(entry.reason, "readiness reason");
      if (
        (evidenceId !== undefined && !isHandoffUUID(evidenceId)) ||
        (checkedAt !== undefined && !validISO8601Timestamp(checkedAt)) ||
        (expiresAt !== undefined && !validISO8601Timestamp(expiresAt)) ||
        (entry.state === "ready" &&
          (evidenceId === undefined ||
            checkedAt === undefined ||
            expiresAt === undefined ||
            reason !== undefined)) ||
        (entry.state !== "ready" &&
          (evidenceId !== undefined ||
            checkedAt !== undefined ||
            expiresAt !== undefined ||
            reason !==
              (entry.state === "failed" ? "sourceFailed" : "sourceUnverified")))
      )
        throw new MalformedVessloDataError(
          "Vesslo schema 3 has invalid Homebrew readiness evidence fields.",
        );
      if (
        checkedAt !== undefined &&
        expiresAt !== undefined &&
        (Date.parse(expiresAt as string) <= Date.parse(checkedAt as string) ||
          Date.parse(expiresAt as string) - Date.parse(checkedAt as string) >
            900000)
      )
        throw new MalformedVessloDataError(
          "Vesslo schema 3 has invalid Homebrew readiness chronology or lifetime.",
        );
      const appId = target.appId.toLowerCase();
      const id =
        typeof evidenceId === "string" ? evidenceId.toLowerCase() : undefined;
      if (appIds.has(appId) || (id !== undefined && evidenceIds.has(id)))
        throw new MalformedVessloDataError(
          "Vesslo schema 3 has duplicate Homebrew readiness identities.",
        );
      appIds.add(appId);
      if (id !== undefined) evidenceIds.add(id);
      return {
        target,
        source: "homebrew",
        state: entry.state as HomebrewReadinessEvidence["state"],
        publisherSessionId: entry.publisherSessionId,
        checkRevision,
        inventoryRevision,
        ...(typeof evidenceId === "string" ? { evidenceId } : {}),
        ...(typeof checkedAt === "string" ? { checkedAt } : {}),
        ...(typeof expiresAt === "string" ? { expiresAt } : {}),
        ...(reason !== undefined ? { reason } : {}),
      };
    },
  );
}

/** Parse the export without inventing freshness or dropping deletion history. */
export function parseVessloData(content: string): VessloData {
  if (Buffer.byteLength(content, "utf8") > MAX_EXPORT_BYTES)
    throw new MalformedVessloDataError(
      "Vesslo export exceeds the 64 MiB read limit.",
    );
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new MalformedVessloDataError("Vesslo export is not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new MalformedVessloDataError("Vesslo export must be an object.");
  }
  const record = parsed as Record<string, unknown>;
  if (
    has(record, "schemaVersion") &&
    record.schemaVersion !== 2 &&
    record.schemaVersion !== 3
  ) {
    throw new MalformedVessloDataError(
      "This export declares an unsupported schema version. Update the extension before using it.",
    );
  }
  const isVersioned = record.schemaVersion === 2 || record.schemaVersion === 3;
  const metadata = isVersioned ? versionedMetadata(record) : {};
  if (!Array.isArray(record.apps)) {
    throw new MalformedVessloDataError("Vesslo export has no app list.");
  }
  const hasUpdateCount = Object.prototype.hasOwnProperty.call(
    record,
    "updateCount",
  );
  if (isVersioned && !hasUpdateCount)
    throw new MalformedVessloDataError(
      "Vesslo versioned export has no update count.",
    );
  if (
    hasUpdateCount &&
    (typeof record.updateCount !== "number" ||
      !Number.isSafeInteger(record.updateCount) ||
      record.updateCount < 0)
  ) {
    throw new MalformedVessloDataError(
      "Vesslo export has an invalid update count.",
    );
  }

  const ids = new Set<string>();
  const apps: VessloApp[] = record.apps.map((raw: unknown) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new MalformedVessloDataError(
        "Vesslo export contains an invalid app.",
      );
    }
    const a = raw as Record<string, unknown>;
    if (isVersioned) {
      for (const key of [
        "isDeleted",
        "isIgnored",
        "isSkipped",
        "isVisibleInUpdates",
        "currentTargetSkipped",
        "hasAnySkippedVersion",
      ])
        if (typeof a[key] !== "boolean")
          throw new MalformedVessloDataError(
            `Vesslo versioned export app has an invalid ${key}.`,
          );
      for (const key of ["sources", "tags"])
        if (
          !Array.isArray(a[key]) ||
          !(a[key] as unknown[]).every((value) => typeof value === "string")
        )
          throw new MalformedVessloDataError(
            `Vesslo versioned export app has an invalid ${key}.`,
          );
      for (const key of ["primaryActionKind", "eligibilityKind", "path"])
        contractString(a[key], key);
    }
    for (const key of ["isDeleted", "isIgnored", "isSkipped"] as const) {
      if (
        Object.prototype.hasOwnProperty.call(a, key) &&
        typeof a[key] !== "boolean"
      ) {
        throw new MalformedVessloDataError(
          "An exported app has an invalid lifecycle or skip flag.",
        );
      }
    }
    const id = isVersioned
      ? contractString(a.id, "app identity")
      : stringOrNull(a.id);
    if (!id || typeof a.name !== "string" || typeof a.path !== "string") {
      throw new MalformedVessloDataError(
        "An exported app is missing its identity, name, or path.",
      );
    }
    if (isVersioned && !UUID.test(id))
      throw new MalformedVessloDataError(
        "Vesslo versioned export app has an invalid UUID.",
      );
    const identityKey = isVersioned ? id.toLowerCase() : id;
    if (ids.has(identityKey)) {
      throw new MalformedVessloDataError(
        "Vesslo export contains duplicate app identities.",
      );
    }
    ids.add(identityKey);
    return {
      id,
      name: stringOrNull(a.name) ?? "Unknown",
      bundleId: isVersioned
        ? optionalIdentity(a.bundleId, "bundle ID")
        : stringOrNull(a.bundleId),
      version: isVersioned
        ? optionalIdentity(a.version, "installed version")
        : stringOrNull(a.version),
      targetVersion: isVersioned
        ? optionalIdentity(a.targetVersion, "target version")
        : stringOrNull(a.targetVersion),
      developer: stringOrNull(a.developer),
      path: a.path,
      icon: stringOrNull(a.icon),
      tags: stringArray(a.tags),
      memo: stringOrNull(a.memo),
      sources: stringArray(a.sources),
      appStoreId: stringOrNull(a.appStoreId),
      homebrewCask: isVersioned
        ? optionalIdentity(a.homebrewCask, "Homebrew cask")
        : stringOrNull(a.homebrewCask),
      isVisibleInUpdates: booleanOrNull(a.isVisibleInUpdates),
      currentTargetSkipped: booleanOrNull(a.currentTargetSkipped),
      hasAnySkippedVersion: booleanOrNull(a.hasAnySkippedVersion),
      exportContract: classifyExportContract(a),
      eligibilityKind: knownKind(
        a.eligibilityKind,
        ELIGIBILITY_KINDS,
        isVersioned,
      ),
      primaryActionKind: knownKind(
        a.primaryActionKind,
        PRIMARY_ACTION_KINDS,
        isVersioned,
      ),
      rawEligibilityKind: stringOrNull(a.eligibilityKind),
      rawPrimaryActionKind: stringOrNull(a.primaryActionKind),
      auditGroups: stringArray(a.auditGroups),
      securityReasons: stringArray(a.securityReasons),
      managementReasons: stringArray(a.managementReasons),
      updateHealthStatus: stringOrNull(a.updateHealthStatus),
      updateHealthReasons: stringArray(a.updateHealthReasons),
      lastUpdateSourceAttemptAt: stringOrNull(a.lastUpdateSourceAttemptAt),
      lastUpdateSourceSuccessAt: stringOrNull(a.lastUpdateSourceSuccessAt),
      updateHealthSource: stringOrNull(a.updateHealthSource),
      updateHealthSourceIdentity: stringOrNull(a.updateHealthSourceIdentity),
      updateHealthSuppressedUntil: stringOrNull(a.updateHealthSuppressedUntil),
      isDeleted: a.isDeleted === true,
      isSkipped: a.isSkipped === true,
      isIgnored: a.isIgnored === true,
    };
  });

  if (
    isVersioned &&
    (record.updateCount !==
      apps.filter((app) => app.isVisibleInUpdates === true).length ||
      apps.some(
        (app) =>
          app.isVisibleInUpdates === true &&
          (app.isDeleted || app.isIgnored || app.currentTargetSkipped === true),
      ))
  )
    throw new MalformedVessloDataError(
      "Vesslo versioned export update count or visibility does not match its app snapshot.",
    );

  return {
    ...metadata,
    exportedAt: stringOrNull(record.exportedAt) ?? "",
    updateCount: hasUpdateCount ? (record.updateCount as number) : null,
    apps,
  };
}
