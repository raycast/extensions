/**
 * @module scope-path
 *
 * Normalizes and validates scope-path values for the find-files search
 * pipeline. Handles AI-generated placeholder paths (e.g. `/Users/USERNAME/...`)
 * and tilde-based paths (e.g. `~/Downloads`) by resolving them to the real
 * home directory.
 *
 * The native bridge (`ray-fb items search --only-in`) requires an existing
 * absolute directory path. Empty scope means global search (`/` default).
 */

import { existsSync, statSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

// ── Types ──

export type ScopePathValidationResult = { valid: true; normalized: string } | { valid: false; error: string };

// ── Placeholder patterns ──

/**
 * Patterns that represent placeholder home directories commonly emitted by AI.
 * Matched against the beginning of the scopePath string.
 */
const HOME_PLACEHOLDER_PREFIXES = ["/Users/USERNAME/", "/Users/you/", "/Users/<username>/"];

/**
 * Check whether a path starts with a known home-placeholder prefix.
 * Returns the remainder after the placeholder segment (e.g. "Downloads")
 * or empty string if the path is exactly the placeholder root.
 */
function matchHomePlaceholder(scopePath: string): string | null {
  for (const prefix of HOME_PLACEHOLDER_PREFIXES) {
    if (scopePath === prefix.slice(0, -1)) {
      // Exact match on the placeholder root (e.g. "/Users/USERNAME")
      return "";
    }
    if (scopePath.startsWith(prefix)) {
      return scopePath.slice(prefix.length);
    }
  }
  return null;
}

// ── Public API ──

/**
 * Normalize a scopePath string.
 *
 * - Empty string → empty string (global search)
 * - `~` → `homedir()`
 * - `~/...` → `homedir()/...`
 * - `/Users/USERNAME/...` → `homedir()/...`
 * - `/Users/you/...` → `homedir()/...`
 * - `/Users/<username>/...` → `homedir()/...`
 * - Real absolute paths → unchanged
 * - Relative paths → throws (caller should use `validateScopePath` instead)
 */
export function normalizeScopePath(scopePath: string): string {
  const trimmed = scopePath.trim();
  if (!trimmed) return "";

  // Tilde expansion
  if (trimmed === "~") return homedir();
  if (trimmed.startsWith("~/")) return resolve(homedir(), trimmed.slice(2));

  // AI placeholder expansion
  const remainder = matchHomePlaceholder(trimmed);
  if (remainder !== null) {
    return remainder ? resolve(homedir(), remainder) : homedir();
  }

  // Only already-absolute paths are allowed beyond this point.
  // Relative paths are rejected to prevent silent cwd resolution.
  if (!trimmed.startsWith("/")) {
    throw new Error(`Scope path must be absolute: "${trimmed}"`);
  }

  return trimmed;
}

/**
 * Validate a (possibly raw) scopePath.
 *
 * Returns `{ valid: true, normalized }` with the normalized absolute path,
 * or `{ valid: false, error }` with a human-readable reason.
 *
 * Validation rules:
 *  - Empty string is valid → global search.
 *  - After normalization, non-empty paths must be absolute.
 *  - Non-empty normalized paths must exist and be directories.
 *  - If `existsSync`/`statSync` throws, the path is invalid.
 */
export function validateScopePath(scopePath: string): ScopePathValidationResult {
  const trimmed = scopePath.trim();

  // Empty = global search
  if (!trimmed) {
    return { valid: true, normalized: "" };
  }

  let normalized: string;
  try {
    normalized = normalizeScopePath(trimmed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { valid: false, error: message };
  }

  if (!normalized.startsWith("/")) {
    return { valid: false, error: `Scope path must be absolute: "${trimmed}"` };
  }

  // Must exist and be a directory
  try {
    if (!existsSync(normalized)) {
      return { valid: false, error: `Scope directory not found: "${normalized}"` };
    }
    const stat = statSync(normalized);
    if (!stat.isDirectory()) {
      return { valid: false, error: `Scope path is not a directory: "${normalized}"` };
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { valid: false, error: `Cannot access scope path "${normalized}": ${reason}` };
  }

  return { valid: true, normalized };
}
