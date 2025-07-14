import { DEFAULT_TITLE, FALLBACK_ICON } from "./constants";

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

export function getDomainKeywords(url: string): string[] {
  if (!url) return [];

  try {
    const { hostname } = new URL(url);

    // Handle IP addresses
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
      return [hostname];
    }

    // Extract domain parts
    const parts = hostname.split(".");
    return [hostname, ...parts];
  } catch {
    // Fallback for malformed URLs
    const domainMatch = url.match(/([a-z0-9\-_]+\.)+[a-z0-9\-_]+/i);
    if (domainMatch && domainMatch[0]) {
      const hostname = domainMatch[0];
      const parts = hostname.split(".");
      return [hostname, ...parts];
    }
    return [];
  }
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

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function extractPlaceholders(templateUrl: string): string[] {
  if (!templateUrl) return [];
  const matches = templateUrl.match(/\$\{([^{}]+)\}/g);
  if (!matches) return [];
  return matches.map((match) => match.slice(2, -1));
}

export function getEnhancedKeywords(text: string): string[] {
  if (!text) return [];

  const keywords = new Set<string>();

  keywords.add(text);
  text.split(/[\s-)(]+/).forEach((keyword) => {
    if (keyword.trim()) {
      keywords.add(keyword.trim());
    }
  });

  return Array.from(keywords).filter((k) => k.length > 0);
}

export function combineKeywords(...keywordArrays: (string | string[])[]): string[] {
  const allKeywords = new Set<string>();

  keywordArrays.forEach((item) => {
    if (typeof item === "string") {
      allKeywords.add(item);
    } else if (Array.isArray(item)) {
      item.forEach((keyword) => {
        if (keyword && typeof keyword === "string") {
          allKeywords.add(keyword);
        }
      });
    }
  });

  return Array.from(allKeywords).filter((k) => k.length > 0);
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
