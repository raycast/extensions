import { DEFAULT_TITLE, FALLBACK_ICON, PLACEHOLDER_PATTERN } from "./constants";
import { Application, Image } from "@raycast/api";

export type MergePlaceholdersResult =
  | { success: true; placeholders: Record<string, string> }
  | { success: false; error: string };

export function mergePlaceholders(
  globalPlaceholders: Record<string, string> | undefined,
  localPlaceholders: Record<string, string> | undefined,
): MergePlaceholdersResult {
  if (!globalPlaceholders && !localPlaceholders) {
    return { success: true, placeholders: {} };
  }

  const merged = {
    ...globalPlaceholders,
    ...localPlaceholders,
  };

  const circularError = detectCircularPlaceholderDependencies(merged);
  if (circularError) {
    return { success: false, error: circularError };
  }

  return { success: true, placeholders: resolvePlaceholderValues(merged) };
}

/**
 * Extracts placeholder keys referenced in a value string.
 * e.g., "${foo}/bar/${baz}" -> ["foo", "baz"]
 */
function extractReferencedPlaceholders(value: string): string[] {
  const matches = value.match(PLACEHOLDER_PATTERN);
  if (!matches) return [];
  return matches.map((match) => match.slice(2, -1));
}

/**
 * Detects circular dependencies in placeholder references using DFS.
 * Returns an error message if a cycle is found, or null if no cycles exist.
 * Exported for use in validation.
 */
export function detectCircularPlaceholderDependencies(placeholders: Record<string, string>): string | null {
  const dependencies = new Map<string, string[]>();

  for (const [key, value] of Object.entries(placeholders)) {
    const refs = extractReferencedPlaceholders(value);
    const validRefs = refs.filter((ref) => ref in placeholders);
    if (validRefs.length > 0) {
      dependencies.set(key, validRefs);
    }
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): string | null {
    if (inStack.has(node)) {
      const cycleStart = path.indexOf(node);
      const cycle = [...path.slice(cycleStart), node];
      return `Circular dependency detected: ${cycle.join(" -> ")}`;
    }

    if (visited.has(node)) {
      return null;
    }

    visited.add(node);
    inStack.add(node);
    path.push(node);

    const deps = dependencies.get(node) || [];
    for (const dep of deps) {
      const error = dfs(dep);
      if (error) return error;
    }

    path.pop();
    inStack.delete(node);
    return null;
  }

  for (const key of dependencies.keys()) {
    const error = dfs(key);
    if (error) return error;
  }

  return null;
}

/**
 * Resolves placeholder references within placeholder values.
 * Handles cases like: projectDirectory: "${teamProjectDirectory}/api/ab-decider"
 * where teamProjectDirectory is another placeholder that needs to be resolved first.
 *
 * Note: This function assumes no circular dependencies exist (checked beforehand).
 */
function resolvePlaceholderValues(placeholders: Record<string, string>): Record<string, string> {
  const resolved: Record<string, string> = { ...placeholders };
  const maxIterations = Object.keys(placeholders).length + 1;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let hasUnresolvedPlaceholders = false;

    for (const [key, value] of Object.entries(resolved)) {
      // Check if value contains placeholder references
      let newValue = value;
      let match;
      // Reset lastIndex for global regex
      PLACEHOLDER_PATTERN.lastIndex = 0;

      while ((match = PLACEHOLDER_PATTERN.exec(value)) !== null) {
        const placeholderKey = match[1];
        const placeholderValue = resolved[placeholderKey];

        if (placeholderValue !== undefined && !placeholderValue.includes("${")) {
          // Only replace if the referenced placeholder is fully resolved
          newValue = newValue.replace(`\${${placeholderKey}}`, placeholderValue);
        } else if (placeholderValue !== undefined) {
          // There's still an unresolved placeholder
          hasUnresolvedPlaceholders = true;
        }
      }

      resolved[key] = newValue;
    }

    if (!hasUnresolvedPlaceholders) {
      break;
    }
  }

  return resolved;
}

export function applyTemplate(templateUrl: string, placeholders: Record<string, string>): string {
  if (!templateUrl || !placeholders) {
    return templateUrl;
  }

  let finalUrl = templateUrl;

  for (const [key, value] of Object.entries(placeholders)) {
    const placeholder = `\${${key}}`;
    // Replace all occurrences manually (not just the first)
    while (finalUrl.includes(placeholder)) {
      finalUrl = finalUrl.replace(placeholder, value);
    }
  }

  return finalUrl;
}

// Cache for domain keyword extraction
const domainCache = new Map<string, string[]>();

export function clearDomainCache() {
  domainCache.clear();
}

export function getDomainKeywords(url: string): string[] {
  if (!url) return [];

  // Check cache first
  const cached = domainCache.get(url);
  if (cached) return cached;

  let result: string[];
  try {
    const { hostname } = new URL(url);

    // Handle IP addresses
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
      result = [hostname];
    } else {
      // Extract domain parts
      const parts = hostname.split(".");
      result = [hostname, ...parts];
    }
  } catch {
    // Fallback for malformed URLs
    const domainMatch = url.match(/([a-z0-9\-_]+\.)+[a-z0-9\-_]+/i);
    if (domainMatch && domainMatch[0]) {
      const hostname = domainMatch[0];
      const parts = hostname.split(".");
      result = [hostname, ...parts];
    } else {
      result = [];
    }
  }

  domainCache.set(url, result);
  return result;
}

export function getSafeTitle(title?: string): string {
  return title || DEFAULT_TITLE;
}

export function getTagAccessories(tags: string[] = []): import("@raycast/api").List.Item.Accessory[] {
  const sorted = tags.slice().sort((a, b) => a.localeCompare(b));
  let accessories: import("@raycast/api").List.Item.Accessory[] = [];
  if (sorted.length > 0) {
    accessories = sorted.slice(0, 2).map((tag) => ({ tag }));
    if (sorted.length > 2) {
      accessories.push({ text: "…", tooltip: sorted.slice(2).join(", ") });
    }
  }
  return accessories;
}

export function extractPlaceholders(templateUrl: string): string[] {
  if (!templateUrl) return [];
  const matches = templateUrl.match(PLACEHOLDER_PATTERN);
  if (!matches) return [];
  return matches.map((match) => match.slice(2, -1));
}

// Simple memoization cache for keyword generation
const keywordCache = new Map<string, string[]>();

export function clearKeywordCache() {
  keywordCache.clear();
}

export function getEnhancedKeywords(text: string): string[] {
  if (!text) return [];

  // Check cache first
  const cached = keywordCache.get(text);
  if (cached) return cached;

  const keywords = new Set<string>();

  keywords.add(text);
  text.split(/[\s-)(]+/).forEach((keyword) => {
    if (keyword.trim()) {
      keywords.add(keyword.trim());
    }
  });

  const result = Array.from(keywords).filter((k) => k.length > 0);
  keywordCache.set(text, result);

  return result;
}

export function combineKeywords(...keywordArrays: (string | string[])[]): string[] {
  const allKeywords = new Set<string>();

  keywordArrays.forEach((item) => {
    if (typeof item === "string") {
      allKeywords.add(item);
    } else if (Array.isArray(item)) {
      item.forEach((keyword) => {
        if (keyword) {
          allKeywords.add(keyword);
        }
      });
    }
  });

  return Array.from(allKeywords).filter((k) => k.length > 0);
}

export function getAppIcon(appNameOrBundleId: string, applications: Application[]): Image.ImageLike | undefined {
  const app = applications.find(
    (app) => app.name === appNameOrBundleId || app.bundleId === appNameOrBundleId || app.path === appNameOrBundleId,
  );
  if (app) {
    return { fileIcon: app.path };
  }
  return undefined;
}

export function getFallbackIcon(providedIcon?: string, hasOpenIn?: boolean): string | undefined {
  if (providedIcon) {
    return providedIcon;
  }

  // If there's an openIn specified, don't provide a fallback icon
  // Let the URLListItem component handle app icon detection
  if (hasOpenIn) {
    return undefined;
  }

  return FALLBACK_ICON;
}
