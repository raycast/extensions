import { FontAsset, FontProvider } from "../types";
import { getLogger } from "./logger";

const log = getLogger("fonts");

/** Known font provider URL patterns */
const FONT_PROVIDER_PATTERNS: Array<{ pattern: RegExp; provider: FontProvider; name: string }> = [
  { pattern: /fonts\.googleapis\.com/i, provider: "google-fonts", name: "Google Fonts" },
  { pattern: /fonts\.gstatic\.com/i, provider: "google-fonts", name: "Google Fonts" },
  { pattern: /use\.typekit\.net/i, provider: "adobe-fonts", name: "Adobe Fonts" },
  { pattern: /typekit\.com/i, provider: "adobe-fonts", name: "Adobe Fonts" },
  { pattern: /use\.fontawesome\.com/i, provider: "font-awesome", name: "Font Awesome" },
  { pattern: /cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome/i, provider: "font-awesome", name: "Font Awesome" },
  { pattern: /kit\.fontawesome\.com/i, provider: "font-awesome", name: "Font Awesome" },
  { pattern: /fonts\.bunny\.net/i, provider: "bunny-fonts", name: "Bunny Fonts" },
  { pattern: /api\.fontshare\.com/i, provider: "fontshare", name: "Fontshare" },
  { pattern: /fast\.fonts\.net/i, provider: "fonts-com", name: "Fonts.com" },
];

/** Human-readable provider names */
export const FONT_PROVIDER_NAMES: Record<FontProvider, string> = {
  "google-fonts": "Google Fonts",
  "adobe-fonts": "Adobe Fonts",
  "font-awesome": "Font Awesome",
  "bunny-fonts": "Bunny Fonts",
  fontshare: "Fontshare",
  "fonts-com": "Fonts.com",
  custom: "Custom",
};

/** Map of numeric weights to human-readable names */
const WEIGHT_NAMES: Record<string, string> = {
  "100": "Thin",
  "200": "ExtraLight",
  "300": "Light",
  "400": "Regular",
  "500": "Medium",
  "600": "SemiBold",
  "700": "Bold",
  "800": "ExtraBold",
  "900": "Black",
};

/** Map of weight names to numeric values (for reverse lookup) */
const WEIGHT_VALUES: Record<string, string> = {
  thin: "100",
  hairline: "100",
  extralight: "200",
  ultralight: "200",
  light: "300",
  regular: "400",
  normal: "400",
  medium: "500",
  semibold: "600",
  demibold: "600",
  bold: "700",
  extrabold: "800",
  ultrabold: "800",
  black: "900",
  heavy: "900",
};

/**
 * Normalize a font weight to a human-readable name
 * Converts numeric weights (100-900) to names (Thin, Light, Regular, Bold, etc.)
 */
export function normalizeWeight(weight: string): string {
  const w = weight.toLowerCase().trim();
  // If it's a numeric weight, convert to name
  if (WEIGHT_NAMES[w]) {
    return WEIGHT_NAMES[w];
  }
  // If it's already a name, normalize it
  if (WEIGHT_VALUES[w]) {
    return WEIGHT_NAMES[WEIGHT_VALUES[w]];
  }
  // Return as-is with first letter capitalized
  return weight.charAt(0).toUpperCase() + weight.slice(1).toLowerCase();
}

/**
 * Get the sort order for a font weight (for sorting fonts by weight)
 */
export function getWeightSortOrder(weight: string | undefined): number {
  if (!weight) return 400;
  const w = weight.toLowerCase().trim();
  // Check if it's a numeric weight
  const num = parseInt(w, 10);
  if (!isNaN(num)) return num;
  // Check if it's a named weight
  if (WEIGHT_VALUES[w]) return parseInt(WEIGHT_VALUES[w], 10);
  return 400;
}

/**
 * Format variants array for display
 * Converts numeric weights to human-readable names
 */
export function formatVariants(variants: string[]): string {
  return variants.map((v) => normalizeWeight(v)).join(", ");
}

/**
 * Get a display name for a font combining family, weight, and style
 * Handles weight ranges like "100 900" for variable fonts
 */
export function getFontDisplayName(font: FontAsset): string {
  const parts = [font.family];

  // Handle weight display
  if (font.variants && font.variants.length > 0) {
    if (font.variants.length === 1) {
      // Single weight - show name if not Regular
      const weight = normalizeWeight(font.variants[0]);
      if (weight !== "Regular") {
        parts.push(weight);
      }
    } else if (font.variants.length === 2) {
      // Check if it's a weight range (e.g., ["100", "900"] for variable fonts)
      const sorted = [...font.variants].sort((a, b) => parseInt(a) - parseInt(b));
      const min = parseInt(sorted[0]);
      const max = parseInt(sorted[1]);
      // If they're far apart, it's likely a variable font range
      if (!isNaN(min) && !isNaN(max) && max - min >= 200) {
        parts.push(`${min} ${max}`);
      }
    }
  }

  // Add style if present and not normal
  if (font.style && font.style.toLowerCase() !== "normal") {
    parts.push(font.style.charAt(0).toUpperCase() + font.style.slice(1).toLowerCase());
  }

  return parts.join(" ");
}

/**
 * Get a subtitle for a font showing format (primary) and provider
 */
export function getFontSubtitle(font: FontAsset): string {
  const parts: string[] = [];

  // Format is primary info (like Font Sniper shows)
  if (font.format) {
    parts.push(font.format.toUpperCase());
  }

  return parts.join(" • ");
}

/**
 * Detect font provider from URL
 */
export function detectFontProvider(url: string): { provider: FontProvider; name: string } | null {
  for (const { pattern, provider, name } of FONT_PROVIDER_PATTERNS) {
    if (pattern.test(url)) {
      return { provider, name };
    }
  }
  return null;
}

/**
 * Extract font families from Google Fonts URL
 * Handles both CSS2 API and legacy API formats:
 * - CSS2: https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Open+Sans
 * - Legacy: https://fonts.googleapis.com/css?family=Roboto:400,700|Open+Sans
 */
export function extractGoogleFonts(url: string): FontAsset[] {
  const fonts: FontAsset[] = [];

  try {
    const urlObj = new URL(url);
    const familyParams = urlObj.searchParams.getAll("family");

    for (const familyParam of familyParams) {
      // CSS2 API format: "Roboto:wght@400;700" or "Open+Sans:ital,wght@0,400;1,700"
      // Legacy format: "Roboto:400,700" or "Roboto:400,700|Open+Sans:300"
      const families = familyParam.split("|");

      for (const family of families) {
        const [name, variantsPart] = family.split(":");
        const familyName = decodeURIComponent(name.replace(/\+/g, " ")).trim();

        if (!familyName) continue;

        let variants: string[] | undefined;

        if (variantsPart) {
          // CSS2 format: "wght@400;700" or "ital,wght@0,400;1,700"
          if (variantsPart.includes("@")) {
            const [, weights] = variantsPart.split("@");
            if (weights) {
              // Extract just the weight numbers
              variants = weights
                .split(";")
                .map((w) => {
                  // Handle "0,400" format (ital,wght) - take the weight part
                  const parts = w.split(",");
                  return parts[parts.length - 1];
                })
                .filter((w) => /^\d+$/.test(w));
            }
          } else {
            // Legacy format: "400,700"
            variants = variantsPart.split(",").filter((w) => /^\d+$/.test(w));
          }
        }

        fonts.push({
          family: familyName,
          provider: "google-fonts",
          url,
          variants: variants && variants.length > 0 ? variants : undefined,
        });
      }
    }
  } catch (e) {
    log.error("fonts:extract-google-fonts-error", { url, error: e });
  }

  log.log("fonts:extracted-google-fonts", { url, count: fonts.length, families: fonts.map((f) => f.family) });
  return fonts;
}

/**
 * Extract font families from Bunny Fonts URL (same format as Google Fonts)
 */
export function extractBunnyFonts(url: string): FontAsset[] {
  // Bunny Fonts uses the same URL format as Google Fonts
  const googleFonts = extractGoogleFonts(url);
  return googleFonts.map((font) => ({
    ...font,
    provider: "bunny-fonts" as FontProvider,
  }));
}

/**
 * Extract font info from Adobe Fonts/Typekit URL
 * Format: https://use.typekit.net/abc1234.css
 * Note: Adobe Fonts doesn't expose family names in the URL, only project ID
 */
export function extractAdobeFonts(url: string): FontAsset[] {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    // Extract project ID from path like "/abc1234.css"
    const match = pathname.match(/\/([a-z0-9]+)\.css$/i);
    if (match) {
      const projectId = match[1];
      return [
        {
          family: `Adobe Fonts Project (${projectId})`,
          provider: "adobe-fonts",
          url,
        },
      ];
    }
  } catch (e) {
    log.error("fonts:extract-adobe-fonts-error", { url, error: e });
  }
  return [];
}

/**
 * Extract font info from Font Awesome URL
 */
export function extractFontAwesome(url: string): FontAsset[] {
  // Font Awesome is an icon font, not a text font
  // We'll still track it but mark it appropriately
  return [
    {
      family: "Font Awesome",
      provider: "font-awesome",
      url,
    },
  ];
}

/** Patterns to detect weight from filename */
const FILENAME_WEIGHT_PATTERNS: Array<{ pattern: RegExp; weight: string }> = [
  { pattern: /[-_]?(thin|hairline)[-_.]?/i, weight: "100" },
  { pattern: /[-_]?(extra-?light|ultra-?light)[-_.]?/i, weight: "200" },
  { pattern: /[-_]?light[-_.]?/i, weight: "300" },
  { pattern: /[-_]?(regular|normal)[-_.]?/i, weight: "400" },
  { pattern: /[-_]?medium[-_.]?/i, weight: "500" },
  { pattern: /[-_]?(semi-?bold|demi-?bold)[-_.]?/i, weight: "600" },
  { pattern: /[-_]?bold[-_.]?/i, weight: "700" },
  { pattern: /[-_]?(extra-?bold|ultra-?bold)[-_.]?/i, weight: "800" },
  { pattern: /[-_]?(black|heavy)[-_.]?/i, weight: "900" },
];

/** Patterns to detect style from filename */
const FILENAME_STYLE_PATTERNS: Array<{ pattern: RegExp; style: string }> = [
  { pattern: /[-_]?italic[-_.]?/i, style: "italic" },
  { pattern: /[-_]?oblique[-_.]?/i, style: "oblique" },
];

/**
 * Extract font info from a preload link
 * Format: <link rel="preload" href="/fonts/custom.woff2" as="font" type="font/woff2">
 */
export function extractPreloadFont(href: string, type?: string): FontAsset {
  let family = "Custom Font";
  let weight: string | undefined;
  let style: string | undefined;

  try {
    const urlObj = new URL(href, "https://example.com");
    const filename = urlObj.pathname.split("/").pop() || "";
    // Remove extension
    let baseName = filename.replace(/\.(woff2?|ttf|otf|eot)$/i, "");

    // Detect weight from filename
    for (const { pattern, weight: w } of FILENAME_WEIGHT_PATTERNS) {
      if (pattern.test(baseName)) {
        weight = w;
        baseName = baseName.replace(pattern, " ");
        break;
      }
    }

    // Detect style from filename
    for (const { pattern, style: s } of FILENAME_STYLE_PATTERNS) {
      if (pattern.test(baseName)) {
        style = s;
        baseName = baseName.replace(pattern, " ");
        break;
      }
    }

    // Clean up remaining name for family
    family = baseName.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();

    // Capitalize first letter of each word
    if (family) {
      family = family
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    } else {
      family = "Custom Font";
    }
  } catch {
    // Use default
  }

  // Extract format from type or URL
  let format: string | undefined;
  if (type) {
    format = type.replace("font/", "");
  } else if (href.includes(".woff2")) {
    format = "woff2";
  } else if (href.includes(".woff")) {
    format = "woff";
  } else if (href.includes(".ttf")) {
    format = "ttf";
  } else if (href.includes(".otf")) {
    format = "otf";
  }

  return {
    family,
    provider: "custom",
    url: href,
    format,
    variants: weight ? [weight] : undefined,
    style,
  };
}

/**
 * Parse fonts from a stylesheet link URL
 */
export function parseFontsFromUrl(url: string): FontAsset[] {
  const providerInfo = detectFontProvider(url);

  if (!providerInfo) {
    return [];
  }

  log.log("fonts:parsing-url", { url, provider: providerInfo.provider });

  switch (providerInfo.provider) {
    case "google-fonts":
      return extractGoogleFonts(url);
    case "bunny-fonts":
      return extractBunnyFonts(url);
    case "adobe-fonts":
      return extractAdobeFonts(url);
    case "font-awesome":
      return extractFontAwesome(url);
    default:
      return [
        {
          family: providerInfo.name,
          provider: providerInfo.provider,
          url,
        },
      ];
  }
}

/**
 * Deduplicate fonts by family name, weight, style, and format
 * This keeps separate entries for different weights/styles of the same family
 */
export function deduplicateFonts(fonts: FontAsset[]): FontAsset[] {
  const seen = new Map<string, FontAsset>();

  for (const font of fonts) {
    // Create a key that includes weight and style to keep variants separate
    const weightKey = font.variants?.join("-") || "default";
    const styleKey = font.style || "normal";
    const formatKey = font.format || "unknown";
    const key = `${font.provider}:${font.family}:${weightKey}:${styleKey}:${formatKey}`;

    if (!seen.has(key)) {
      seen.set(key, { ...font });
    }
  }

  const result = Array.from(seen.values());
  log.log("fonts:deduplicated", { input: fonts.length, output: result.length });
  return result;
}

/**
 * Extract @font-face blocks from CSS using brace-counting (ReDoS-safe)
 */
function extractFontFaceBlocks(css: string): string[] {
  const blocks: string[] = [];
  const fontFaceStart = /@font-face\s*\{/gi;
  let match;

  while ((match = fontFaceStart.exec(css)) !== null) {
    const startIndex = match.index + match[0].length;
    let braceCount = 1;
    let endIndex = startIndex;

    // Limit parsing to prevent infinite loops on malformed CSS
    const maxLength = Math.min(startIndex + 10000, css.length);

    while (braceCount > 0 && endIndex < maxLength) {
      const char = css[endIndex];
      if (char === "{") braceCount++;
      else if (char === "}") braceCount--;
      endIndex++;
    }

    if (braceCount === 0) {
      blocks.push(css.slice(startIndex, endIndex - 1));
    }
  }

  return blocks;
}

/**
 * Parse font format from URL or format hint
 */
function parseFormat(url: string, formatHint?: string): string | undefined {
  if (formatHint) {
    const hint = formatHint.toLowerCase();
    if (hint.includes("woff2")) return "woff2";
    if (hint.includes("woff")) return "woff";
    if (hint.includes("truetype") || hint.includes("ttf")) return "ttf";
    if (hint.includes("opentype") || hint.includes("otf")) return "otf";
    if (hint.includes("embedded-opentype") || hint.includes("eot")) return "eot";
  }

  // Infer from URL extension
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes(".woff2")) return "woff2";
  if (lowerUrl.includes(".woff")) return "woff";
  if (lowerUrl.includes(".ttf")) return "ttf";
  if (lowerUrl.includes(".otf")) return "otf";
  if (lowerUrl.includes(".eot")) return "eot";

  // Check data URI mime type
  if (url.startsWith("data:")) {
    if (url.includes("font/woff2") || url.includes("application/font-woff2")) return "woff2";
    if (url.includes("font/woff") || url.includes("application/font-woff")) return "woff";
    if (url.includes("font/ttf") || url.includes("font/truetype")) return "ttf";
    if (url.includes("font/otf") || url.includes("font/opentype")) return "otf";
    if (url.includes("application/vnd.ms-fontobject")) return "eot";
  }

  return undefined;
}

/**
 * Parse @font-face blocks from CSS and extract font information
 */
export function parseFontFaceFromCSS(css: string, baseUrl: string): FontAsset[] {
  const fonts: FontAsset[] = [];
  const blocks = extractFontFaceBlocks(css);

  log.log("fonts:parsing-fontface", { baseUrl, blockCount: blocks.length });

  for (const block of blocks) {
    // Extract font-family
    const familyMatch = block.match(/font-family\s*:\s*["']?([^"';}]+)["']?/i);
    if (!familyMatch) {
      log.log("fonts:fontface-no-family", { block: block.substring(0, 100) });
      continue;
    }

    const family = familyMatch[1].trim();

    // Extract font-weight (can be single value like "400" or range like "100 900")
    const weightMatch = block.match(/font-weight\s*:\s*([^;}\n]+)/i);
    let variants: string[] | undefined;
    if (weightMatch) {
      const weightValue = weightMatch[1].trim();
      // Check for weight range (variable fonts): "100 900"
      const rangeMatch = weightValue.match(/(\d+)\s+(\d+)/);
      if (rangeMatch) {
        variants = [rangeMatch[1], rangeMatch[2]];
      } else {
        // Single weight
        const singleWeight = weightValue.replace(/[^\d]/g, "") || "400";
        if (singleWeight !== "400") {
          variants = [singleWeight];
        }
      }
    }

    // Extract font-style
    const styleMatch = block.match(/font-style\s*:\s*([^;}\n]+)/i);
    const style = styleMatch ? styleMatch[1].trim().toLowerCase() : undefined;

    // Extract src URLs with format hints
    const srcMatch = block.match(/src\s*:\s*([^;]+)/i);
    if (!srcMatch) {
      log.log("fonts:fontface-no-src", { family });
      continue;
    }

    const srcValue = srcMatch[1];

    // Parse url() entries with optional format()
    const urlRegex = /url\(\s*["']?([^"')\s]+)["']?\s*\)(?:\s*format\(\s*["']?([^"')]+)["']?\s*\))?/gi;
    let urlMatch;
    let foundUrl = false;

    while ((urlMatch = urlRegex.exec(srcValue)) !== null) {
      const rawUrl = urlMatch[1];
      const formatHint = urlMatch[2];

      // Skip data URIs for now (they're embedded)
      if (rawUrl.startsWith("data:")) {
        continue;
      }

      // Resolve relative URLs
      let resolvedUrl = rawUrl;
      try {
        if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
          resolvedUrl = new URL(rawUrl, baseUrl).href;
        }
      } catch {
        // Keep original URL if resolution fails
      }

      const format = parseFormat(rawUrl, formatHint);

      // Detect provider from URL
      const providerInfo = detectFontProvider(resolvedUrl);

      fonts.push({
        family,
        provider: providerInfo?.provider || "custom",
        url: resolvedUrl,
        format,
        variants,
        style: style !== "normal" ? style : undefined,
      });

      foundUrl = true;
      // Only take the first URL (usually the best format)
      break;
    }

    if (!foundUrl) {
      log.log("fonts:fontface-no-valid-url", { family, src: srcValue.substring(0, 100) });
    }
  }

  log.log("fonts:parsed-fontface", {
    baseUrl,
    fontCount: fonts.length,
    families: [...new Set(fonts.map((f) => f.family))],
  });

  return fonts;
}

/**
 * Extract inline <style> content from HTML
 */
export function extractInlineStyles(html: string): string[] {
  const styles: string[] = [];
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = styleRegex.exec(html)) !== null) {
    styles.push(match[1]);
  }
  log.log("fonts:extracted-inline-styles", { count: styles.length });
  return styles;
}
