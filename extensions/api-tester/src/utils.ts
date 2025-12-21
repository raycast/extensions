import { getActiveEnvironment } from "./storage";

/**
 * Replace environment variables in a string with their values
 * Variables are in the format {{variableName}}
 */
export async function replaceVariables(text: string): Promise<string> {
  const env = await getActiveEnvironment();
  if (!env) return text;

  let result = text;
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const matches = text.matchAll(variableRegex);

  for (const match of matches) {
    const variableName = match[1].trim();
    const variable = env.variables.find(
      (v) => v.key === variableName && v.enabled,
    );
    if (variable) {
      result = result.replace(match[0], variable.value);
    }
  }

  return result;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Format milliseconds to human readable string
 */
export function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Get status code color
 */
export function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return "🟢";
  if (status >= 300 && status < 400) return "🔵";
  if (status >= 400 && status < 500) return "🟡";
  if (status >= 500) return "🔴";
  return "⚪";
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Try to parse JSON, return null if invalid
 */
export function tryParseJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Format JSON with indentation
 */
export function formatJSON(json: string): string {
  try {
    const parsed = JSON.parse(json);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return json;
  }
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Build query string from key-value pairs
 */
export function buildQueryString(
  params: Array<{ key: string; value: string; enabled: boolean }>,
): string {
  const enabledParams = params.filter((p) => p.enabled && p.key);
  if (enabledParams.length === 0) return "";

  const queryString = enabledParams
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join("&");
  return `?${queryString}`;
}

/**
 * Parse query string to key-value pairs
 */
export function parseQueryString(
  url: string,
): Array<{ key: string; value: string; enabled: boolean }> {
  try {
    const urlObj = new URL(url);
    const params: Array<{ key: string; value: string; enabled: boolean }> = [];
    urlObj.searchParams.forEach((value, key) => {
      params.push({ key, value, enabled: true });
    });
    return params;
  } catch {
    return [];
  }
}
