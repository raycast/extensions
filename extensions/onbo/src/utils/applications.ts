import { LocalStorage } from "@raycast/api";
import type { ApplicationStatus, RoleType } from "./roles";
import { RoleListing } from "../models/RolesAPI";

/**
 * Storage key used for persisting AppliedRole entries in Raycast LocalStorage.
 */
export const APPLIED_JOBS_KEY = "applied_jobs";

/**
 * Local representation of a job or application tracked by the extension.
 * - id: Unique identifier (positive from API or negative for user/imported entries).
 * - company/role: Basic job information.
 * - role_type: "New Grad" or "Internship".
 * - status: Application status lifecycle.
 * - locations: One or more locations as strings.
 * - is_active: Whether the source listing is currently active.
 * - appliedDate/statusUpdatedAt: ISO timestamps for tracking progress.
 * - notes: Optional free-form notes.
 */
export interface AppliedRole {
  id: number;
  company: string;
  role: string;
  role_type: RoleType;
  appliedDate?: string;
  application_url: string;
  status: ApplicationStatus;
  locations: string[];
  is_active: boolean;
  statusUpdatedAt?: string;
  notes?: string;
}

/**
 * Options to control conflict resolution during batch upsert (CSV import).
 * - onlyUpdateIfNewer (default: true): Only update existing records if incoming.statusUpdatedAt is newer.
 * - allowNoTimestamp (default: false): If true and onlyUpdateIfNewer is on, treat missing incoming timestamp as "newer".
 * - forceOverwrite (default: false): If true, overwrite existing records regardless of timestamps.
 */
export type UpsertOptions = {
  onlyUpdateIfNewer?: boolean;
  allowNoTimestamp?: boolean;
  forceOverwrite?: boolean;
};

/**
 * Maps various legacy or API role_type values to the canonical RoleType.
 * Returns null for unrecognized input.
 *
 * @param rt - Incoming role type value to normalize.
 */
function normalizeRoleType(rt: unknown): RoleType | null {
  if (rt === "New Grad" || rt === "Internship") return rt;
  if (rt === "jobs") return "New Grad";
  if (rt === "internships") return "Internship";
  return null;
}

/**
 * Upserts a single AppliedRole into storage under its id (replace if exists).
 *
 * @param job - Fully-formed AppliedRole to save.
 */
export async function markAsSaved(job: AppliedRole): Promise<void> {
  const existing = await getSavedRoles();
  const updated = [...existing.filter((j) => j.id !== job.id), job];
  await LocalStorage.setItem(APPLIED_JOBS_KEY, JSON.stringify(updated));
}

/**
 * Saves a RoleListing with a specific initial status (e.g., applied).
 * Also stamps statusUpdatedAt and sets appliedDate when appropriate.
 *
 * @param job - The RoleListing from the API.
 * @param roleType - "New Grad" or "Internship".
 * @param status - Initial ApplicationStatus to set.
 */
export async function saveWithStatus(job: RoleListing, roleType: RoleType, status: ApplicationStatus): Promise<void> {
  const now = new Date().toISOString();

  const savedRole: AppliedRole = {
    id: job.id,
    company: job.company,
    role: job.role,
    role_type: roleType,
    status: status,
    statusUpdatedAt: now,
    application_url: job.application_url,
    locations: job.locations,
    is_active: job.is_active,
    ...(status === "applied" && { appliedDate: now }),
  };

  const existing = await getSavedRoles();
  const updated = [...existing.filter((j) => j.id !== job.id), savedRole];
  await LocalStorage.setItem(APPLIED_JOBS_KEY, JSON.stringify(updated));
}

/**
 * Retrieves all saved roles (optionally filtered by role_type).
 * Normalizes role_type values and rewrites storage if normalization occurs.
 *
 * @param role_type - Optional filter for "New Grad" or "Internship".
 * @returns Array of AppliedRole.
 */
export async function getSavedRoles(role_type?: RoleType): Promise<AppliedRole[]> {
  const stored = await LocalStorage.getItem<string>(APPLIED_JOBS_KEY);
  if (!stored) return [];

  const raw: AppliedRole[] = JSON.parse(stored) as AppliedRole[];
  let mutated = false;

  const normalized = raw
    .map((job) => {
      const norm = normalizeRoleType(job.role_type);
      if (!norm) return null;

      let next: AppliedRole = job;

      if (norm !== job.role_type) {
        next = { ...next, role_type: norm };
        mutated = true;
      }

      return next;
    })
    .filter(Boolean) as AppliedRole[];

  if (mutated) {
    await LocalStorage.setItem(APPLIED_JOBS_KEY, JSON.stringify(normalized));
  }

  if (role_type) {
    return normalized.filter((job) => job.role_type === role_type);
  }
  return normalized;
}

/**
 * Indicates if storage currently contains both role types (Internship and New Grad).
 *
 * @returns True if both types are present, false otherwise.
 */
export async function hasBothRoleTypes(): Promise<boolean> {
  const existing = await getSavedRoles();
  const hasInternship = existing.some((job) => job.role_type === "Internship");
  const hasNewGrad = existing.some((job) => job.role_type === "New Grad");
  return hasInternship && hasNewGrad;
}

/**
 * Removes a saved role by id and persists the updated collection.
 *
 * @param jobId - Identifier of the role to remove.
 */
export async function removeFromSaved(jobId: number): Promise<void> {
  const existing = await getSavedRoles();
  const updated = existing.filter((j) => j.id !== jobId);
  await LocalStorage.setItem(APPLIED_JOBS_KEY, JSON.stringify(updated));
}

/**
 * Updates the status (and timestamps) of an existing saved role by id.
 * Sets appliedDate when transitioning to "applied" and missing it.
 *
 * @param jobId - Identifier of the role to update.
 * @param status - New ApplicationStatus to apply.
 */
export async function updateApplicationStatus(jobId: number, status: ApplicationStatus): Promise<void> {
  const existing = await getSavedRoles();
  const now = new Date().toISOString();

  const updated = existing.map((job) => {
    if (job.id !== jobId) return job;

    const next: AppliedRole = { ...job, status, statusUpdatedAt: now };
    if (status === "applied" && !job.appliedDate) {
      next.appliedDate = now;
    }
    return next;
  });

  await LocalStorage.setItem(APPLIED_JOBS_KEY, JSON.stringify(updated));
}

/**
 * Updates notes for a saved role and persists the change.
 * No-ops if the role id is not currently saved.
 *
 * @param jobId - Identifier of the saved role to update.
 * @param notes - New notes string (may be empty to clear).
 */
export async function updateNotes(jobId: number, notes: string): Promise<void> {
  const existing = await getSavedRoles();

  const updated = existing.map((job) => {
    if (job.id !== jobId) return job;
    return { ...job, notes };
  });

  await LocalStorage.setItem(APPLIED_JOBS_KEY, JSON.stringify(updated));
}

/**
 * Compute next unique negative id given an existing collection.
 * Starts at -1 and decrements (-2, -3, ...) to avoid collisions.
 *
 * @param existing - Current collection of roles to inspect.
 * @returns Next available negative id.
 */
export function getNextNegativeId(existing: AppliedRole[]): number {
  const negatives = existing.map((r) => r.id).filter((id) => id < 0);
  if (negatives.length === 0) return -1;
  const minNeg = Math.min(...negatives);
  return minNeg - 1;
}

/**
 * Internal: true if incoming timestamp is newer than existing according to options.
 */
function isNewer(incomingISO?: string, existingISO?: string, opts?: UpsertOptions): boolean {
  const onlyNewer = opts?.onlyUpdateIfNewer !== false; // default true
  if (!onlyNewer) return true; // if onlyUpdateIfNewer disabled, always treat as newer
  const allowNoTs = !!opts?.allowNoTimestamp;

  const ti = incomingISO ? Date.parse(incomingISO) : NaN;
  const te = existingISO ? Date.parse(existingISO) : NaN;

  if (Number.isNaN(ti)) {
    return allowNoTs;
  }
  if (Number.isNaN(te)) {
    return true;
  }
  return ti > te;
}

/**
 * Batch merge roles into storage with conflict resolution options.
 * - If incoming id matches existing, merge according to options.
 * - If incoming id <= 0 or missing, dedupe by application_url; if found, merge that entry.
 * - Otherwise assign unique negative id and insert.
 *
 * @param roles - Incoming roles to merge.
 * @param options - Conflict resolution options (newer-wins, allowNoTimestamp, forceOverwrite).
 * @returns Summary counts for imported, updated, and skip reasons.
 */
export async function upsertMany(
  roles: AppliedRole[],
  options?: UpsertOptions,
): Promise<{ imported: number; updated: number; skippedOlder: number; skippedNoTimestamp: number }> {
  const existing = await getSavedRoles();

  const byId = new Map<number, AppliedRole>(existing.map((r) => [r.id, r]));
  const byUrl = new Map<string, AppliedRole>(existing.map((r) => [r.application_url, r]));

  let nextNeg = getNextNegativeId(existing);
  let imported = 0;
  let updated = 0;
  let skippedOlder = 0;
  let skippedNoTimestamp = 0;

  const force = !!options?.forceOverwrite;

  const applyMerge = (
    current: AppliedRole,
    incoming: AppliedRole,
  ): { result: AppliedRole; didUpdate: boolean; skipReason?: "older" | "no-ts" } => {
    if (force) {
      const merged: AppliedRole = {
        ...incoming,
        id: current.id,
        // prevent regression of appliedDate if incoming lacks it
        appliedDate: incoming.appliedDate ?? current.appliedDate,
      };
      return { result: merged, didUpdate: true };
    }

    // Decide using timestamp rules
    const incomingHasTs = !!incoming.statusUpdatedAt && !Number.isNaN(Date.parse(incoming.statusUpdatedAt));
    const newer = isNewer(incoming.statusUpdatedAt, current.statusUpdatedAt, options);

    if (newer) {
      const merged: AppliedRole = {
        ...incoming,
        id: current.id,
        appliedDate: incoming.appliedDate ?? current.appliedDate,
      };
      return { result: merged, didUpdate: true };
    }

    if (!incomingHasTs && options?.onlyUpdateIfNewer !== false) {
      // Skipped due to missing timestamp when onlyUpdateIfNewer is active and allowNoTimestamp is false
      return { result: current, didUpdate: false, skipReason: "no-ts" };
    }

    // Skipped because not newer
    return { result: current, didUpdate: false, skipReason: "older" };
  };

  for (const role of roles) {
    // Match by id when present
    if (Number.isFinite(role.id) && byId.has(role.id)) {
      const current = byId.get(role.id)!;
      const { result, didUpdate, skipReason } = applyMerge(current, role);
      byId.set(result.id, result);
      byUrl.set(result.application_url, result);
      if (didUpdate) updated += 1;
      else if (skipReason === "older") skippedOlder += 1;
      else if (skipReason === "no-ts") skippedNoTimestamp += 1;
      continue;
    }

    // If id missing/negative, dedupe by URL
    if (!Number.isFinite(role.id) || role.id <= 0) {
      const match = byUrl.get(role.application_url);
      if (match) {
        const incoming: AppliedRole = { ...role, id: match.id };
        const { result, didUpdate, skipReason } = applyMerge(match, incoming);
        byId.set(result.id, result);
        byUrl.set(result.application_url, result);
        if (didUpdate) updated += 1;
        else if (skipReason === "older") skippedOlder += 1;
        else if (skipReason === "no-ts") skippedNoTimestamp += 1;
        continue;
      }

      // New entry: assign a new negative id
      const assigned: AppliedRole = { ...role, id: nextNeg };
      nextNeg -= 1;
      byId.set(assigned.id, assigned);
      byUrl.set(assigned.application_url, assigned);
      imported += 1;
      continue;
    }

    // New positive id: insert
    byId.set(role.id, role);
    byUrl.set(role.application_url, role);
    imported += 1;
  }

  const merged = Array.from(byId.values());
  await LocalStorage.setItem(APPLIED_JOBS_KEY, JSON.stringify(merged));
  return { imported, updated, skippedOlder, skippedNoTimestamp };
}
