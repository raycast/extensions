import fs from "fs";
import path from "path";
import { AppliedRole, upsertMany, type UpsertOptions } from "./applications";
import type { ApplicationStatus, RoleType } from "./roles";

/**
 * Escapes a value per RFC 4180 rules: quote if it contains commas, quotes, or newlines.
 *
 * @param val - Raw string value to escape.
 * @returns Properly escaped CSV field.
 */
function csvEscape(val: string): string {
  if (val.includes(",") || val.includes("\n") || val.includes('"') || val.includes("\r")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

/**
 * Strict header list used for export and validated for import (exact names).
 * Any subset is allowed for import; order is not significant.
 */
export const CANONICAL_HEADERS: Array<keyof AppliedRole> = [
  "id",
  "company",
  "role",
  "role_type",
  "status",
  "appliedDate",
  "application_url",
  "locations",
  "is_active",
  "statusUpdatedAt",
  "notes",
];

/**
 * Writes a CSV file with canonical headers and RFC-compliant escaping.
 * Preserves commas in locations and joins multiple locations with newlines.
 *
 * @param data - AppliedRole rows to export.
 * @param folder - Destination folder path.
 * @param filename - Output file name (should end with .csv).
 * @returns Error on failure, or null on success.
 */
export function generateCSV(data: AppliedRole[], folder: string, filename: string): Error | null {
  if (!data || data.length === 0) {
    return new Error("No applications to export.");
  }

  const header = CANONICAL_HEADERS.join(",") + "\n";

  const rows = data
    .map((row) =>
      CANONICAL_HEADERS.map((key) => {
        const value = row[key] as unknown;

        if (key === "locations" && Array.isArray(value)) {
          // Preserve commas in city, state, keep multiple locations in one cell separated by newline
          const joined = (value as string[]).join("\n");
          return csvEscape(joined);
        }

        if (typeof value === "boolean") return value ? "true" : "false";
        return csvEscape(value == null ? "" : String(value));
      }).join(","),
    )
    .join("\n");

  const filePath = path.join(folder, filename);
  try {
    fs.writeFileSync(filePath, header + rows);
    return null;
  } catch (err) {
    return err as Error;
  }
}

/**
 * Parses CSV content per RFC 4180, handling quoted fields, embedded quotes, and newlines.
 *
 * @param content - Raw CSV text.
 * @returns Matrix of string cells (rows and columns).
 */
function parseCSVRaw(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;

  while (i < content.length) {
    const char = content[i];
    if (inQuotes) {
      if (char === '"') {
        const next = content[i + 1];
        if (next === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        field += char;
        i += 1;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i += 1;
      } else if (char === ",") {
        row.push(field);
        field = "";
        i += 1;
      } else if (char === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        i += 1;
      } else if (char === "\r") {
        i += 1; // normalize CRLF
      } else {
        field += char;
        i += 1;
      }
    }
  }
  row.push(field);
  rows.push(row);
  return rows;
}

/**
 * Parses a numeric id from a string, returning undefined on invalid input.
 *
 * @param raw - Raw id text.
 */
function parseId(raw?: string): number | undefined {
  if (!raw || raw.trim() === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return Math.trunc(n);
}

/**
 * Validates the role type against canonical values ("New Grad" | "Internship").
 *
 * @param raw - Raw role type text.
 */
function parseRoleType(raw?: string): RoleType | undefined {
  if (!raw) return undefined;
  const v = raw.trim();
  return v === "New Grad" || v === "Internship" ? (v as RoleType) : undefined;
}

/**
 * Normalizes the status to one of the ApplicationStatus enum values.
 *
 * @param raw - Raw status text (case-insensitive).
 */
function parseStatus(raw?: string): ApplicationStatus | undefined {
  if (!raw) return undefined;
  const v = raw.trim().toLowerCase();
  if (v === "saved") return "saved";
  if (v === "applied") return "applied";
  if (v === "interviewing") return "interviewing";
  if (v === "offer") return "offer";
  if (v === "rejected") return "rejected";
  return undefined;
}

/**
 * Parses a boolean-like string (true/false/yes/no/1/0) into a boolean.
 *
 * @param raw - Raw boolean-like text.
 */
function parseBool(raw?: string): boolean | undefined {
  if (!raw) return undefined;
  const v = raw.trim().toLowerCase();
  if (["true", "yes", "1"].includes(v)) return true;
  if (["false", "no", "0"].includes(v)) return false;
  return undefined;
}

/**
 * Converts a date string into an ISO timestamp if valid.
 *
 * @param raw - Raw date text.
 */
function parseISODate(raw?: string): string | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/**
 * Parses locations from a single cell, splitting by newline (export default),
 * and also accepting "|" or ";" separators. Commas in city/state are preserved.
 *
 * @param raw - Raw locations cell content.
 */
function parseLocations(raw?: string): string[] | undefined {
  if (raw == null) return undefined;
  return raw
    .split(/\r?\n|[|;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Validates that a string is an http(s) URL.
 *
 * @param raw - Raw URL string.
 */
function isValidURL(raw?: string): boolean {
  if (!raw) return false;
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Strict CSV importer:
 * - Validates headers strictly against CANONICAL_HEADERS (any subset, any order).
 * - Throws on unknown or duplicate headers.
 * - Validates and normalizes rows, defaults missing fields, and collects row errors.
 * - Upserts all valid rows in batch (dedup by id or application_url, assigns negative ids).
 *
 * Conflict policy is controlled by options (newer-wins by default).
 *
 * @param filePath - Absolute path to the CSV file to import.
 * @param options - UpsertOptions (onlyUpdateIfNewer, allowNoTimestamp, forceOverwrite).
 * @returns Import summary with counts and row-level errors (if any).
 */
export async function importCSV(
  filePath: string,
  options?: UpsertOptions,
): Promise<{
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  skippedOlder: number;
  skippedNoTimestamp: number;
}> {
  const content = fs.readFileSync(filePath, "utf8");
  const matrix = parseCSVRaw(content);
  if (matrix.length === 0) {
    throw new Error("Empty CSV.");
  }

  const [rawHeader, ...rows] = matrix;
  const header = rawHeader.map((h) => h.trim());

  // Strict header validation
  const allowed = new Set(CANONICAL_HEADERS);
  const duplicates = header.filter((h, idx) => header.indexOf(h) !== idx);
  if (duplicates.length > 0) {
    throw new Error(`Duplicate headers found: ${Array.from(new Set(duplicates)).join(", ")}`);
  }
  const unknown = header.filter((h) => !allowed.has(h as keyof AppliedRole));
  if (unknown.length > 0) {
    throw new Error(`Unknown headers: ${unknown.join(", ")}. Allowed headers: ${CANONICAL_HEADERS.join(", ")}`);
  }

  // Build header index map
  const colIndex: Partial<Record<keyof AppliedRole, number>> = {};
  for (let i = 0; i < header.length; i++) {
    const name = header[i] as keyof AppliedRole;
    colIndex[name] = i;
  }

  const errors: string[] = [];
  const candidates: AppliedRole[] = [];

  const isRowEmpty = (row: string[]) => row.every((c) => (c ?? "").trim() === "");

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (isRowEmpty(row)) continue;

    const get = (k: keyof AppliedRole): string | undefined => {
      const idx = colIndex[k];
      return typeof idx === "number" ? row[idx] : undefined;
    };

    const id = parseId(get("id"));
    const company = get("company")?.trim();
    const role = get("role")?.trim();
    const role_type = parseRoleType(get("role_type")) ?? ("New Grad" as RoleType);
    const status = parseStatus(get("status")) ?? ("saved" as ApplicationStatus);
    const appliedDate = parseISODate(get("appliedDate"));
    const application_url = get("application_url")?.trim();
    const locations = parseLocations(get("locations")) ?? [];
    const is_active = parseBool(get("is_active"));
    const statusUpdatedAt = parseISODate(get("statusUpdatedAt"));
    const notes = get("notes");

    // Validate required fields at row level
    const probs: string[] = [];
    if (!application_url || !isValidURL(application_url)) probs.push("application_url");
    if (!company) probs.push("company");
    if (!role) probs.push("role");

    if (probs.length > 0) {
      errors.push(`Row ${r + 2}: missing/invalid ${probs.join(", ")}`);
      continue;
    }

    const final: AppliedRole = {
      id: typeof id === "number" ? id : -1, // will be normalized to unique negative in upsertMany
      company: company!,
      role: role!,
      role_type: role_type,
      status: status,
      appliedDate: appliedDate,
      application_url: application_url!,
      locations: locations,
      is_active: typeof is_active === "boolean" ? is_active : true,
      statusUpdatedAt: statusUpdatedAt, // do not default to now; allows proper "newer" comparison
      notes: notes,
    };

    candidates.push(final);
  }

  const { imported, updated, skippedOlder, skippedNoTimestamp } = await upsertMany(candidates, options);
  const skipped = errors.length + skippedOlder + skippedNoTimestamp;
  return { imported, updated, skipped, errors, skippedOlder, skippedNoTimestamp };
}
