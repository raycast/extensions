import { z } from "zod";
import { extractJSON } from "./string-to-json-schema";

// `ccusage` is run as `ccusage@latest`, so its JSON shape shifts between
// releases (fields renamed, moved into nested objects, or dropped). A bare Zod
// message ("expected string, received undefined") names the path that failed
// but not what the payload actually looked like, leaving a maintainer unable to
// tell which release a reporter is on or how the schema diverged. This builds a
// redacted structural fingerprint: object keys and value types only, never the
// values, so it is safe to paste into a bug report.

const MAX_ISSUES = 8;
const SHAPE_DEPTH = 5;
const RECORD_DEPTH = 2;

type Shape = string | { array: number; of?: Shape } | { [key: string]: Shape };

/**
 * Describes a value by type. Arrays collapse to their length plus the shape of
 * their first element so a large payload stays compact while still revealing the
 * element schema.
 */
export function describeShape(value: unknown, depth: number = SHAPE_DEPTH): Shape {
  if (value === null) return "null";

  if (Array.isArray(value)) {
    if (value.length === 0 || depth <= 0) return { array: value.length };
    return { array: value.length, of: describeShape(value[0], depth - 1) };
  }

  if (typeof value === "object") {
    if (depth <= 0) return "object";
    const record = value as Record<string, unknown>;
    const shape: Record<string, Shape> = {};
    for (const key of Object.keys(record).sort()) {
      shape[key] = describeShape(record[key], depth - 1);
    }
    return shape;
  }

  return typeof value;
}

function valueAtPath(root: unknown, path: ReadonlyArray<string | number>): unknown {
  let current = root;
  for (const key of path) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string | number, unknown>)[key];
  }
  return current;
}

/**
 * Builds a privacy-preserving, traceable error message for a ccusage schema
 * mismatch: the ccusage version, the overall output shape, and the actual key
 * set of each record that failed validation.
 */
export function describeParseFailure(label: string, rawStdout: string, error: z.ZodError, version?: string): string {
  let root: unknown;
  let jsonParsed = true;
  try {
    root = JSON.parse(extractJSON(rawStdout));
  } catch {
    jsonParsed = false;
  }

  const lines = [
    `${label}: ccusage output did not match the expected schema.`,
    `ccusage version: ${version ?? "unknown"}`,
  ];

  if (jsonParsed) {
    lines.push(`Output shape: ${JSON.stringify(describeShape(root))}`);
  } else {
    lines.push(`Output was not valid JSON (${rawStdout.length} chars).`);
  }

  const shown = error.issues.slice(0, MAX_ISSUES);
  const suffix = error.issues.length > MAX_ISSUES ? ` (first ${MAX_ISSUES})` : "";
  lines.push(`${error.issues.length} schema issue(s)${suffix}:`);

  for (const issue of shown) {
    const pathStr = issue.path.length ? issue.path.join(".") : "(root)";
    lines.push(`  • ${pathStr}: ${issue.message}`);

    if (jsonParsed && issue.path.length) {
      const parentPath = issue.path.slice(0, -1);
      const parent = valueAtPath(root, parentPath);
      if (parent !== null && typeof parent === "object" && !Array.isArray(parent)) {
        const parentLabel = parentPath.length ? parentPath.join(".") : "root";
        lines.push(`    actual ${parentLabel} shape: ${JSON.stringify(describeShape(parent, RECORD_DEPTH))}`);
      }
    }
  }

  return lines.join("\n");
}
