import { FontInfo, FontFormat, ExtractedCSS } from "../types";
import { resolveUrl } from "./urlHelpers";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchWithHeaders(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,text/css,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.text();
}

function extractStylesheetUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];

  // Match <link rel="stylesheet" href="...">
  const linkRegex =
    /<link[^>]+rel=["']?stylesheet["']?[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    urls.push(resolveUrl(baseUrl, match[1]));
  }

  // Also match <link href="..." rel="stylesheet">
  const linkRegex2 =
    /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']?stylesheet["']?[^>]*>/gi;
  while ((match = linkRegex2.exec(html)) !== null) {
    urls.push(resolveUrl(baseUrl, match[1]));
  }

  return [...new Set(urls)]; // Deduplicate
}

function extractInlineStyles(html: string): string[] {
  const styles: string[] = [];
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = styleRegex.exec(html)) !== null) {
    styles.push(match[1]);
  }
  return styles;
}

function extractImportUrls(css: string, baseUrl: string): string[] {
  const urls: string[] = [];
  // Match @import url("...") or @import "..."
  const importRegex = /@import\s+(?:url\()?["']?([^"');\s]+)["']?\)?/gi;
  let match;
  while ((match = importRegex.exec(css)) !== null) {
    urls.push(resolveUrl(baseUrl, match[1]));
  }
  return urls;
}

function parseFormat(url: string, formatHint?: string): FontFormat {
  if (formatHint) {
    const hint = formatHint.toLowerCase();
    if (hint.includes("woff2")) return "woff2";
    if (hint.includes("woff")) return "woff";
    if (hint.includes("truetype") || hint.includes("ttf")) return "ttf";
    if (hint.includes("opentype") || hint.includes("otf")) return "otf";
    if (hint.includes("embedded-opentype") || hint.includes("eot"))
      return "eot";
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
    if (url.includes("font/woff2")) return "woff2";
    if (url.includes("font/woff")) return "woff";
    if (url.includes("font/ttf") || url.includes("font/truetype")) return "ttf";
    if (url.includes("font/otf") || url.includes("font/opentype")) return "otf";
    if (url.includes("application/vnd.ms-fontobject")) return "eot";
    if (url.includes("application/font-woff2")) return "woff2";
    if (url.includes("application/font-woff")) return "woff";
  }

  return "unknown";
}

function normalizeWeight(weight: string): string {
  // Convert numeric weights to names, or clean up existing names
  const w = weight.toLowerCase().trim();
  const weightMap: Record<string, string> = {
    "100": "Thin",
    "200": "ExtraLight",
    "300": "Light",
    "400": "Regular",
    normal: "Regular",
    "500": "Medium",
    "600": "SemiBold",
    "700": "Bold",
    bold: "Bold",
    "800": "ExtraBold",
    "900": "Black",
  };
  return weightMap[w] || weight;
}

// Common selectors that indicate primary page fonts (not library/widget fonts)
const PRIMARY_SELECTORS = [
  "body",
  "html",
  ":root",
  "*",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "a",
  "span",
  "div",
  "li",
  "ul",
  "ol",
  "main",
  "article",
  "section",
  "header",
  "footer",
  "nav",
  "aside",
  "button",
  "input",
  "textarea",
  "label",
  "form",
  "td",
  "th",
  "table",
  "caption",
  "blockquote",
  "pre",
  "code",
  "em",
  "strong",
  "b",
  "i",
];

// Library/widget class patterns to skip
const SKIP_PATTERNS = [
  /\.katex/i,
  /\.math/i,
  /\.latex/i,
  /\.mathjax/i,
  /\.hljs/i,
  /\.highlight/i,
  /\.prism/i,
  /\.syntax/i,
  /\.fa-/i,
  /\.icon/i,
  /\.material-icons/i,
  /\.emoji/i,
  /\.flag-/i,
];

function isPrimarySelector(selector: string): boolean {
  // Skip selectors matching library patterns
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(selector)) return false;
  }

  const selectorLower = selector.toLowerCase();

  // Check if selector targets primary elements
  for (const primary of PRIMARY_SELECTORS) {
    // Match: body, .class body, body.class, #id body, etc.
    const regex = new RegExp(`(^|[\\s,>+~])${primary}([\\s,>+~.#:\\[]|$)`, "i");
    if (regex.test(selectorLower) || selectorLower === primary) {
      return true;
    }
  }

  // Also accept simple class/id selectors on common patterns
  if (
    /^\.(container|wrapper|content|main|page|app|root|layout)/i.test(selector)
  ) {
    return true;
  }

  return false;
}

function extractFontFamiliesFromValue(value: string): string[] {
  const families: string[] = [];
  const genericFonts = [
    "serif",
    "sans-serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
    "ui-serif",
    "ui-sans-serif",
    "ui-monospace",
    "ui-rounded",
    "inherit",
    "initial",
    "unset",
    "revert",
  ];

  // Split by comma and extract each font name
  const fontNames = value.split(",").map((f) => {
    return f
      .trim()
      .replace(/^["']|["']$/g, "")
      .trim();
  });

  for (const name of fontNames) {
    if (!genericFonts.includes(name.toLowerCase()) && name.length > 0) {
      families.push(name);
    }
  }

  return families;
}

// Extract @font-face blocks using a brace-counting parser (ReDoS-safe)
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

// Flatten nested CSS by extracting content from @media, @supports, @layer etc.
function flattenNestedCSS(css: string): string {
  let result = css;

  // Extract content from nested at-rules (media queries, supports, layer, etc.)
  const atRuleStart = /@(?:media|supports|layer|container)[^{]*\{/gi;
  let match;

  while ((match = atRuleStart.exec(css)) !== null) {
    const startIndex = match.index + match[0].length;
    let braceCount = 1;
    let endIndex = startIndex;
    const maxLength = Math.min(startIndex + 50000, css.length);

    while (braceCount > 0 && endIndex < maxLength) {
      const char = css[endIndex];
      if (char === "{") braceCount++;
      else if (char === "}") braceCount--;
      endIndex++;
    }

    if (braceCount === 0) {
      // Append the inner content (rules inside the at-rule)
      result += " " + css.slice(startIndex, endIndex - 1);
    }
  }

  return result;
}

function extractUsedFontFamilies(css: string): Set<string> {
  const families = new Set<string>();

  // Flatten nested CSS (extract rules from media queries, etc.)
  const flattenedCSS = flattenNestedCSS(css);

  // Remove @font-face blocks using the safe parser approach
  const fontFaceBlocks = extractFontFaceBlocks(flattenedCSS);
  let cssWithoutFontFace = flattenedCSS;
  for (const block of fontFaceBlocks) {
    cssWithoutFontFace = cssWithoutFontFace.replace(block, "");
  }

  // Match CSS rules: selector { ... font-family: value; ... }
  // This regex captures: selector(s) { declarations }
  const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
  let ruleMatch;

  while ((ruleMatch = ruleRegex.exec(cssWithoutFontFace)) !== null) {
    const selector = ruleMatch[1].trim();
    const declarations = ruleMatch[2];

    // Only process rules targeting primary selectors
    if (!isPrimarySelector(selector)) continue;

    // Look for font-family in declarations
    const fontFamilyMatch = declarations.match(/font-family\s*:\s*([^;]+)/i);
    if (fontFamilyMatch) {
      const fontFamilies = extractFontFamiliesFromValue(fontFamilyMatch[1]);
      fontFamilies.forEach((f) => families.add(f));
    }

    // Also check font shorthand
    const fontMatch = declarations.match(/font\s*:\s*([^;]+)/i);
    if (fontMatch) {
      // Extract quoted font names from shorthand
      const quotedFonts = fontMatch[1].match(/["']([^"']+)["']/g);
      if (quotedFonts) {
        for (const quoted of quotedFonts) {
          const name = quoted.replace(/^["']|["']$/g, "").trim();
          if (name.length > 0) families.add(name);
        }
      }
    }
  }

  return families;
}

function normalizeFontKey(font: FontInfo): string {
  // Normalize family: lowercase, collapse whitespace, remove quotes
  const family = font.family
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Normalize weight: use our weight mapping or lowercase
  const weight = (font.weight || "regular").toLowerCase();

  // Normalize style
  const style = (font.style || "normal").toLowerCase();

  return `${family}|${weight}|${style}`;
}

function deduplicateFonts(fonts: FontInfo[]): FontInfo[] {
  // Group by normalized family + weight + style + format (keep one per format)
  const groups = new Map<string, FontInfo>();

  for (const font of fonts) {
    const key = `${normalizeFontKey(font)}|${font.format}`;
    if (!groups.has(key)) {
      groups.set(key, font);
    }
  }

  return Array.from(groups.values());
}

function parseFontFaceBlocks(css: string, baseUrl: string): FontInfo[] {
  const fonts: FontInfo[] = [];
  const blocks = extractFontFaceBlocks(css);

  for (const block of blocks) {
    // Extract font-family
    const familyMatch = block.match(
      /font-family\s*:\s*["']?([^"';}\n]+)["']?/i,
    );
    if (!familyMatch) continue;

    const family = familyMatch[1].trim();

    // Extract font-weight (e.g., "400", "bold", "normal")
    const weightMatch = block.match(/font-weight\s*:\s*([^;}\n]+)/i);
    const weight = weightMatch
      ? normalizeWeight(weightMatch[1].trim())
      : undefined;

    // Extract font-style (e.g., "normal", "italic", "oblique")
    const styleMatch = block.match(/font-style\s*:\s*([^;}\n]+)/i);
    const style = styleMatch ? styleMatch[1].trim().toLowerCase() : undefined;

    // Extract all src URLs with their format hints
    // Match: url("path") format("woff2"), url('path') format('woff'), url(path)
    const srcMatch = block.match(/src\s*:\s*([^;]+)/i);
    if (!srcMatch) continue;

    const srcValue = srcMatch[1];

    // Parse individual url() entries
    const urlRegex =
      /url\(\s*["']?([^"')\s]+)["']?\s*\)(?:\s*format\(\s*["']?([^"')]+)["']?\s*\))?/gi;
    let urlMatch;

    while ((urlMatch = urlRegex.exec(srcValue)) !== null) {
      const rawUrl = urlMatch[1];
      const formatHint = urlMatch[2];

      const isDataUri = rawUrl.startsWith("data:");
      const resolvedUrl = isDataUri ? rawUrl : resolveUrl(baseUrl, rawUrl);
      const format = parseFormat(rawUrl, formatHint);

      // Extract base64 content for data URIs
      let dataUriContent: string | undefined;
      if (isDataUri) {
        const base64Match = rawUrl.match(/base64,(.+)$/);
        if (base64Match) {
          dataUriContent = base64Match[1];
        }
      }

      fonts.push({
        family,
        url: resolvedUrl,
        format,
        weight,
        style: style !== "normal" ? style : undefined,
        accessible: true, // Will be verified later
        isDataUri,
        dataUriContent,
      });
    }
  }

  return fonts;
}

async function fetchCSSWithImports(
  url: string,
  visited: Set<string> = new Set(),
): Promise<ExtractedCSS[]> {
  if (visited.has(url)) return [];
  visited.add(url);

  try {
    const css = await fetchWithHeaders(url);
    const results: ExtractedCSS[] = [{ content: css, baseUrl: url }];

    // Recursively fetch @import stylesheets
    const importUrls = extractImportUrls(css, url);
    for (const importUrl of importUrls) {
      const imported = await fetchCSSWithImports(importUrl, visited);
      results.push(...imported);
    }

    return results;
  } catch {
    // Silently skip inaccessible stylesheets
    return [];
  }
}

export async function extractFonts(pageUrl: string): Promise<FontInfo[]> {
  const allFonts: FontInfo[] = [];
  const usedFamilies = new Set<string>();

  // Fetch the HTML page
  const html = await fetchWithHeaders(pageUrl);

  // Get all CSS sources
  const cssContents: ExtractedCSS[] = [];

  // Extract inline styles
  const inlineStyles = extractInlineStyles(html);
  for (const style of inlineStyles) {
    cssContents.push({ content: style, baseUrl: pageUrl });
  }

  // Extract and fetch external stylesheets
  const stylesheetUrls = extractStylesheetUrls(html, pageUrl);
  for (const url of stylesheetUrls) {
    const fetched = await fetchCSSWithImports(url);
    cssContents.push(...fetched);
  }

  // First pass: find all font-families actually USED in CSS rules
  for (const { content } of cssContents) {
    const families = extractUsedFontFamilies(content);
    families.forEach((f) => usedFamilies.add(f));
  }

  // Also check inline styles in HTML elements
  // Use separate patterns for double-quoted and single-quoted to handle nested quotes
  const doubleQuotedStyleRegex = /style="([^"]*)"/gi;
  const singleQuotedStyleRegex = /style='([^']*)'/gi;
  let inlineMatch;
  while ((inlineMatch = doubleQuotedStyleRegex.exec(html)) !== null) {
    const families = extractUsedFontFamilies(inlineMatch[1]);
    families.forEach((f) => usedFamilies.add(f));
  }
  while ((inlineMatch = singleQuotedStyleRegex.exec(html)) !== null) {
    const families = extractUsedFontFamilies(inlineMatch[1]);
    families.forEach((f) => usedFamilies.add(f));
  }

  // Second pass: parse @font-face declarations
  for (const { content, baseUrl } of cssContents) {
    const fonts = parseFontFaceBlocks(content, baseUrl);
    allFonts.push(...fonts);
  }

  // Filter to only fonts whose family is actually used
  const usedFonts = allFonts.filter((font) => {
    // Check if this font's family matches any used family (case-insensitive)
    for (const used of usedFamilies) {
      if (font.family.toLowerCase() === used.toLowerCase()) {
        return true;
      }
    }
    return false;
  });

  // Deduplicate by family+weight+style+format (keep one per format variant)
  return deduplicateFonts(usedFonts);
}

export async function checkFontAccessibility(
  font: FontInfo,
): Promise<FontInfo> {
  if (font.isDataUri) {
    return { ...font, accessible: true };
  }

  try {
    const response = await fetch(font.url, {
      method: "HEAD",
      headers: {
        "User-Agent": USER_AGENT,
      },
    });

    const size = response.headers.get("content-length");

    return {
      ...font,
      accessible: response.ok,
      size: size ? parseInt(size, 10) : undefined,
    };
  } catch {
    return { ...font, accessible: false };
  }
}
