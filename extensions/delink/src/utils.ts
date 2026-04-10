import { LocalStorage } from "@raycast/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ParamType = "json" | "base64" | "timestamp" | "url-encoded" | "plain";

export interface ParsedParam {
  key: string;
  value: string;
  decodedValue: string;
  type: ParamType;
}

export interface ParsedUrl {
  /** The original raw URL string, used for history storage. */
  rawUrl: string;
  protocol: string;
  host: string;
  pathname: string;
  hash: string;
  params: ParsedParam[];
}

export interface HistoryEntry {
  rawUrl: string;
  host: string;
  parsedAt: number; // Unix timestamp (ms)
}

// ─── Param type detection ─────────────────────────────────────────────────────

/**
 * Attempts to decode a Base64 string. Returns the decoded string if valid,
 * or null if the input is not valid Base64 or decodes to non-printable content.
 */
export function tryDecodeBase64(value: string): string | null {
  // Base64 strings are typically longer than 8 chars and match the charset
  if (value.length < 8 || !/^[A-Za-z0-9+/=_-]+$/.test(value)) return null;
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => "%" + char.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    // Reject if decoded result contains too many non-printable characters
    const nonPrintable = decoded.split("").filter((c: string) => c.charCodeAt(0) < 32 && c !== "\n" && c !== "\t");
    if (nonPrintable.length / decoded.length > 0.1) return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Attempts to interpret a value as a Unix timestamp (seconds or milliseconds).
 * Returns a human-readable date string if valid, or null otherwise.
 */
export function tryParseTimestamp(value: string): string | null {
  if (!/^\d{10}(\d{3})?$/.test(value.trim())) return null;
  const numericValue = Number(value);
  const timestampMs = value.length === 10 ? numericValue * 1000 : numericValue;
  const date = new Date(timestampMs);
  // Sanity check: must be between year 2000 and 2100
  if (date.getFullYear() < 2000 || date.getFullYear() > 2100) return null;
  return date.toISOString().replace("T", " ").replace("Z", " UTC");
}

/**
 * Detects the semantic type of a decoded parameter value.
 * Priority: json > base64 > timestamp > url-encoded > plain
 */
export function detectParamType(decodedValue: string, rawValue: string): ParamType {
  if (tryFormatJson(decodedValue) !== decodedValue) return "json";
  // Timestamp check must come before Base64: pure digit strings (e.g. Unix timestamps)
  // are valid Base64 characters and would otherwise be misidentified.
  if (tryParseTimestamp(decodedValue) !== null) return "timestamp";
  if (tryDecodeBase64(decodedValue) !== null) return "base64";
  if (rawValue !== decodedValue) return "url-encoded";
  return "plain";
}

// ─── URL parsing ──────────────────────────────────────────────────────────────

/**
 * Parses a URL string and extracts its query parameters.
 *
 * URLSearchParams.forEach() automatically percent-decodes values, so we
 * manually parse the raw query string to preserve the original encoded form.
 */
export function parseUrl(rawUrl: string): ParsedUrl | null {
  try {
    const trimmed = rawUrl.trim().replace(/^['"]|['"]$/g, "");
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return null;
    const parsed = new URL(trimmed);

    const rawValueMap = new Map<string, string[]>();
    const rawQueryString = parsed.search.slice(1); // strip leading "?"
    for (const segment of rawQueryString.split("&")) {
      const equalsIndex = segment.indexOf("=");
      if (equalsIndex === -1) continue;
      const rawKey = segment.slice(0, equalsIndex);
      const rawValue = segment.slice(equalsIndex + 1);
      const decodedKey = decodeURIComponent(rawKey);
      if (!rawValueMap.has(decodedKey)) rawValueMap.set(decodedKey, []);
      rawValueMap.get(decodedKey)!.push(rawValue);
    }

    const keyOccurrenceCount = new Map<string, number>();
    const params: ParsedParam[] = [];
    parsed.searchParams.forEach((decodedValue, key) => {
      const occurrenceIndex = keyOccurrenceCount.get(key) ?? 0;
      keyOccurrenceCount.set(key, occurrenceIndex + 1);
      const rawValue = rawValueMap.get(key)?.[occurrenceIndex] ?? decodedValue;
      params.push({
        key,
        value: rawValue, // true percent-encoded raw value
        decodedValue, // already decoded by URLSearchParams
        type: detectParamType(decodedValue, rawValue),
      });
    });

    return {
      rawUrl: trimmed,
      protocol: parsed.protocol,
      host: parsed.host,
      pathname: parsed.pathname,
      hash: parsed.hash,
      params,
    };
  } catch {
    return null;
  }
}

// ─── JSON formatting ──────────────────────────────────────────────────────────

/**
 * Attempts to parse a string as JSON and returns a pretty-printed version.
 * Returns the original string if it is not valid JSON.
 */
export function tryFormatJson(value: string): string {
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}

// ─── History ──────────────────────────────────────────────────────────────────

const HISTORY_STORAGE_KEY = "url-history";
const MAX_HISTORY_SIZE = 20;

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await LocalStorage.getItem<string>(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export async function saveToHistory(parsedUrl: ParsedUrl): Promise<void> {
  try {
    const history = await loadHistory();
    // Remove duplicate entries for the same URL
    const deduplicated = history.filter((entry) => entry.rawUrl !== parsedUrl.rawUrl);
    const updated: HistoryEntry[] = [
      { rawUrl: parsedUrl.rawUrl, host: parsedUrl.host, parsedAt: Date.now() },
      ...deduplicated,
    ].slice(0, MAX_HISTORY_SIZE);
    await LocalStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // History is non-critical; silently ignore storage errors
  }
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_STORAGE_KEY);
}
