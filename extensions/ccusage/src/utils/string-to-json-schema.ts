import { z } from "zod";

/**
 * Extracts the JSON portion from a string that may contain non-JSON prefix
 * output (e.g. npx download progress warnings printed to stdout before the
 * actual JSON payload).
 *
 * When `npx ccusage@latest` is invoked for the first time, or when the cached
 * package needs refreshing, npx can emit warning/progress lines to stdout
 * before the JSON output. `JSON.parse` fails on such contaminated strings;
 * this helper locates the first `{` or `[` character and slices from there so
 * that the parser only sees valid JSON.
 */
function extractJSON(raw: string): string {
  const objStart = raw.indexOf("{");
  const arrStart = raw.indexOf("[");

  if (objStart === -1 && arrStart === -1) {
    return raw;
  }

  if (objStart === -1) return raw.slice(arrStart);
  if (arrStart === -1) return raw.slice(objStart);

  return raw.slice(Math.min(objStart, arrStart));
}

export const stringToJSON = z.string().transform((str, ctx): unknown => {
  try {
    return JSON.parse(extractJSON(str));
  } catch (e) {
    ctx.addIssue({
      code: "custom",
      message: `Invalid JSON: ${e instanceof Error ? e.message : "Unknown error"}`,
    });
    return z.NEVER;
  }
});
