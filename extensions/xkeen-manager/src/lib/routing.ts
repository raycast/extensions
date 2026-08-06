// === Routing: category parsing & text-based insertion ===

export type RoutingCategory = {
  index: number;
  number: number;
  title: string;
  outboundTag: string;
  field: "domain" | "ip" | "ruleSet";
  charStart: number;
  charEnd: number;
};

export type EntryType = "domain" | "keyword" | "geosite" | "geoip";

export const ENTRY_TYPES: Record<EntryType, { label: string; placeholder: string }> = {
  domain: { label: "domain:", placeholder: "example.com, another.org" },
  keyword: { label: "keyword:", placeholder: "youtube, telegram" },
  geosite: { label: "ext:geosite", placeholder: "google, youtube, category-ai-!cn" },
  geoip: { label: "ext:geoip", placeholder: "telegram, facebook, ru" },
};

export function entryTypesForField(field: "domain" | "ip" | "ruleSet"): EntryType[] {
  if (field === "ip") return ["geoip"];
  return ["domain", "keyword", "geosite"];
}

export function normalizerForEntryType(entryType: EntryType): (raw: string) => string | null {
  switch (entryType) {
    case "domain":
      return normalizeDomainToken;
    case "keyword":
      return normalizeKeywordToken;
    case "geosite":
      return normalizeGeositeToken;
    case "geoip":
      return normalizeGeoipToken;
  }
}

// ---------------------------------------------------------------------------
// Internal helper: find matching closing brace/bracket
// ---------------------------------------------------------------------------

export function findMatchingBrace(text: string, start: number): number {
  if (start < 0 || start >= text.length) return -1;
  const open = text[start];
  const close = open === "{" ? "}" : open === "[" ? "]" : null;
  if (!close) return -1;

  let depth = 0;
  let i = start;
  let inStr = false;
  let esc = false;
  let inLine = false;
  let inBlock = false;

  while (i < text.length) {
    const c = text[i];
    const n = i + 1 < text.length ? text[i + 1] : "";

    if (inLine) {
      if (c === "\n") inLine = false;
      i++;
      continue;
    }
    if (inBlock) {
      if (c === "*" && n === "/") {
        inBlock = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (inStr) {
      if (esc) {
        esc = false;
      } else if (c === "\\") {
        esc = true;
      } else if (c === '"') {
        inStr = false;
      }
      i++;
      continue;
    }

    if (c === '"') {
      inStr = true;
      i++;
      continue;
    }
    if (c === "/" && n === "/") {
      inLine = true;
      i += 2;
      continue;
    }
    if (c === "/" && n === "*") {
      inBlock = true;
      i += 2;
      continue;
    }

    if (c === "{" || c === "[") {
      depth++;
    } else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) return i;
    }

    i++;
  }

  return -1;
}

// ---------------------------------------------------------------------------
// Parse routing categories from raw text with comments
// ---------------------------------------------------------------------------

export function parseRoutingCategories(rawText: string): RoutingCategory[] {
  const headerRe = /\/\/\s*(?:=+\s*\n\s*\/\/\s*)?(\d+)\.\s*(.+?)(?:\s*\n\s*\/\/\s*=+)?(?=\s*\n)/g;
  const categories: RoutingCategory[] = [];
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = headerRe.exec(rawText)) !== null) {
    const num = parseInt(match[1], 10);
    const title = match[2].trim();
    const afterHeader = match.index + match[0].length;

    // Scan forward for the next `{`
    const braceIdx = rawText.indexOf("{", afterHeader);
    if (braceIdx === -1) continue;

    const closeIdx = findMatchingBrace(rawText, braceIdx);
    if (closeIdx === -1) continue;

    const ruleText = rawText.slice(braceIdx, closeIdx + 1);

    // Extract outboundTag
    const tagMatch = ruleText.match(/"outboundTag"\s*:\s*"([^"]+)"/);
    const outboundTag = tagMatch ? tagMatch[1] : "unknown";

    // Detect field
    let field: "domain" | "ip" | "ruleSet" = "domain";
    if (/"domain"\s*:/.test(ruleText)) {
      field = "domain";
    } else if (/"ip"\s*:/.test(ruleText)) {
      field = "ip";
    } else if (/"ruleSet"\s*:/.test(ruleText)) {
      field = "ruleSet";
    }

    categories.push({
      index: index++,
      number: num,
      title,
      outboundTag,
      field,
      charStart: braceIdx,
      charEnd: closeIdx,
    });
  }

  return categories;
}

// ---------------------------------------------------------------------------
// Shared helper: locate a category's field array bounds within rawText
// ---------------------------------------------------------------------------

type ArrayBounds = { absOpen: number; absClose: number };

function findCategoryArrayBounds(rawText: string, category: RoutingCategory): ArrayBounds | null {
  const ruleSlice = rawText.slice(category.charStart, category.charEnd + 1);
  const fieldKey = `"${category.field}"`;

  // Find the field array within the rule
  const fieldIdx = ruleSlice.indexOf(fieldKey);
  if (fieldIdx === -1) return null;

  // Find the `[` after the field key
  const colonAfterKey = ruleSlice.indexOf(":", fieldIdx + fieldKey.length);
  if (colonAfterKey === -1) return null;

  let bracketIdx = -1;
  for (let i = colonAfterKey + 1; i < ruleSlice.length; i++) {
    if (ruleSlice[i] === "[") {
      bracketIdx = i;
      break;
    }
    if (!/\s/.test(ruleSlice[i])) break;
  }
  if (bracketIdx === -1) return null;

  const closeBracketRel = findMatchingBrace(ruleSlice, bracketIdx);
  if (closeBracketRel === -1) return null;

  return {
    absOpen: category.charStart + bracketIdx,
    absClose: category.charStart + closeBracketRel,
  };
}

// ---------------------------------------------------------------------------
// Insert domains/IPs/ruleSets into a category's field array
// ---------------------------------------------------------------------------

export function insertDomainsIntoCategory(rawText: string, category: RoutingCategory, values: string[]): string {
  if (!values.length) return rawText;

  const bounds = findCategoryArrayBounds(rawText, category);
  if (!bounds) return rawText;

  // Absolute positions in rawText
  const { absOpen, absClose } = bounds;

  const arrayContent = rawText.slice(absOpen + 1, absClose);
  const trimmed = arrayContent.trim();

  // Detect indent from existing entries or default
  let indent = "      ";
  const existingLineMatch = arrayContent.match(/\n(\s+)"/);
  if (existingLineMatch) {
    indent = existingLineMatch[1];
  }

  const formatted = values.map((v) => `${indent}${JSON.stringify(v)}`).join(",\n");

  let newArray: string;
  if (trimmed === "") {
    // Empty array: insert entries on new lines
    newArray = "[\n" + formatted + "\n" + indent.slice(0, Math.max(indent.length - 2, 0)) + "]";
  } else if (!arrayContent.includes("\n")) {
    // Single-line array: expand to multi-line
    const existingEntries = trimmed;
    // Re-indent existing entries
    const entries = existingEntries
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const reformatted = entries.map((e) => `${indent}${e}`).join(",\n");
    const closingIndent = indent.slice(0, Math.max(indent.length - 2, 0));
    newArray = "[\n" + reformatted + ",\n" + formatted + "\n" + closingIndent + "]";
  } else {
    // Multi-line array: append before closing bracket
    // Find last non-whitespace before closing bracket
    const lastContentIdx = arrayContent.search(/\S\s*$/);
    const needsComma = lastContentIdx !== -1 && arrayContent[lastContentIdx] !== ",";

    const beforeClose = rawText.slice(0, absClose);
    const afterClose = rawText.slice(absClose);

    // Find the position just before the closing bracket's whitespace
    const insertion = (needsComma ? "," : "") + "\n" + formatted;
    // Insert right before closing ] (after last content line)
    return (
      beforeClose.trimEnd() +
      insertion +
      "\n" +
      indent.slice(0, Math.max(indent.length - 2, 0)) +
      afterClose.trimStart()
    );
  }

  return rawText.slice(0, absOpen) + newArray + rawText.slice(absClose + 1);
}

// ---------------------------------------------------------------------------
// Extract the string values already present in a category's field array
// ---------------------------------------------------------------------------

export function existingValuesInCategory(rawText: string, category: RoutingCategory): Set<string> {
  const bounds = findCategoryArrayBounds(rawText, category);
  if (!bounds) return new Set();

  const arrayContent = rawText.slice(bounds.absOpen + 1, bounds.absClose);
  const values = new Set<string>();
  const stringRe = /"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = stringRe.exec(arrayContent)) !== null) {
    try {
      values.add(JSON.parse(`"${m[1]}"`) as string);
    } catch {
      values.add(m[1]);
    }
  }
  return values;
}

// ---------------------------------------------------------------------------
// Detect the inboundTag array used elsewhere in a routing file, so newly
// created categories can match the existing convention instead of a
// hardcoded guess.
// ---------------------------------------------------------------------------

export function detectInboundTags(rawText: string): string[] | null {
  const keyLiteral = '"inboundTag"';
  const keyIdx = rawText.indexOf(keyLiteral);
  if (keyIdx === -1) return null;

  const colonIdx = rawText.indexOf(":", keyIdx + keyLiteral.length);
  if (colonIdx === -1) return null;

  let bracketIdx = -1;
  for (let i = colonIdx + 1; i < rawText.length; i++) {
    if (rawText[i] === "[") {
      bracketIdx = i;
      break;
    }
    if (!/\s/.test(rawText[i])) break;
  }
  if (bracketIdx === -1) return null;

  const closeIdx = findMatchingBrace(rawText, bracketIdx);
  if (closeIdx === -1) return null;

  const arrayContent = rawText.slice(bracketIdx + 1, closeIdx);
  const tags: string[] = [];
  const stringRe = /"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = stringRe.exec(arrayContent)) !== null) {
    try {
      tags.push(JSON.parse(`"${m[1]}"`) as string);
    } catch {
      tags.push(m[1]);
    }
  }
  return tags.length > 0 ? tags : null;
}

// ---------------------------------------------------------------------------
// Create a "Raycast" category with empty domain rule
// ---------------------------------------------------------------------------

export type RaycastCategoryOptions = {
  proxyTag?: string;
  inboundTags?: string[];
};

const DEFAULT_PROXY_TAG = "vless-reality";
const DEFAULT_INBOUND_TAGS = ["redirect", "tproxy", "mixed"];

// Builds the new-category block. `trailingComma` must be true when the block is
// inserted directly before another array element (so the JSON stays valid), and
// false when it is appended as the last element of the rules array (a trailing
// comma there would produce `},]` and break the JSON).
function buildRaycastCategoryBlock(
  newNum: number,
  trailingComma: boolean,
  options: RaycastCategoryOptions = {},
): string {
  const proxyTag = options.proxyTag || DEFAULT_PROXY_TAG;
  const inboundTags =
    options.inboundTags && options.inboundTags.length > 0 ? options.inboundTags : DEFAULT_INBOUND_TAGS;
  const inboundTagsLiteral = inboundTags.map((t) => `"${t}"`).join(", ");
  return [
    "",
    `// ${newNum}. Manual domains (Raycast, proxy domain)`,
    "{",
    '  "type": "field",',
    `  "inboundTag": [${inboundTagsLiteral}],`,
    `  "outboundTag": "${proxyTag}",`,
    '  "domain": []',
    trailingComma ? "}," : "}",
    "",
  ].join("\n");
}

export function createRaycastCategory(
  rawText: string,
  categories: RoutingCategory[],
  options: RaycastCategoryOptions = {},
): string {
  const maxNum = categories.reduce((m, c) => Math.max(m, c.number), 0);
  const newNum = maxNum + 1;

  // Find insertion point: before first direct-outbound category
  const directCategories = categories.filter((c) => c.outboundTag === "direct");

  if (directCategories.length > 0) {
    // Insert before the first direct category's comment block
    // Walk backward from charStart to find the comment header
    const firstDirect = directCategories[0];
    let insertPos = firstDirect.charStart;

    // Look backward for the comment header
    const before = rawText.slice(0, insertPos);
    const headerMatch = before.match(/\/\/\s*=+\s*\n\s*\/\/\s*\d+\.\s*[^\n]+\n\s*\/\/\s*=+\s*\n\s*$/);
    if (headerMatch && headerMatch.index !== undefined) {
      insertPos = headerMatch.index;
    }

    // Inserting before another rule: our block needs a trailing comma to
    // separate it from the next array element.
    const block = buildRaycastCategoryBlock(newNum, true, options);
    return rawText.slice(0, insertPos) + block + rawText.slice(insertPos);
  }

  // Fallback: append before the end of the rules array
  // Find last `}` that closes a rule, and insert after it
  if (categories.length > 0) {
    const last = categories[categories.length - 1];
    const afterLast = last.charEnd + 1;
    // Appending as the last element: the comma goes before the block, and the
    // block itself must NOT end with a trailing comma.
    const block = buildRaycastCategoryBlock(newNum, false, options);
    return rawText.slice(0, afterLast) + "," + block + rawText.slice(afterLast);
  }

  // No categories at all: just append
  return rawText + buildRaycastCategoryBlock(newNum, false, options);
}

// ---------------------------------------------------------------------------
// Find category with "raycast" in title
// ---------------------------------------------------------------------------

export function findRaycastCategory(categories: RoutingCategory[]): RoutingCategory | null {
  return categories.find((c) => /raycast|ручные домены/i.test(c.title)) ?? null;
}

// ---------------------------------------------------------------------------
// Token normalization helpers
// ---------------------------------------------------------------------------

export function normalizeDomainToken(raw: string): string | null {
  const v = (raw || "").trim();
  if (!v) return null;
  if (/^(domain:|keyword:|regexp:|full:|ext:)/i.test(v)) return v;
  try {
    if (/^https?:\/\//i.test(v)) {
      const u = new URL(v);
      if (u.hostname) return `domain:${u.hostname}`;
    }
  } catch {
    // ignore URL parse errors and keep raw domain token
  }
  return `domain:${v}`;
}

export function normalizeGeositeToken(raw: string): string | null {
  const v = (raw || "").trim();
  if (!v) return null;
  if (/^ext:geosite_v2fly\.dat:/i.test(v)) return v;
  if (/^ext:/i.test(v)) return v;
  return `ext:geosite_v2fly.dat:${v}`;
}

export function normalizeGeoipToken(raw: string): string | null {
  const v = (raw || "").trim();
  if (!v) return null;
  if (/^ext:geoip_v2fly\.dat:/i.test(v)) return v;
  if (/^geoip:/i.test(v)) return v.replace(/^geoip:/i, "ext:geoip_v2fly.dat:");
  if (/^ext:/i.test(v)) return v;
  return `ext:geoip_v2fly.dat:${v}`;
}

export function normalizeKeywordToken(raw: string): string | null {
  const v = (raw || "").trim();
  if (!v) return null;
  if (/^(domain:|keyword:|regexp:|full:|ext:)/i.test(v)) return v;
  return `keyword:${v}`;
}

export function normalizeRuleSetToken(raw: string): string | null {
  const v = (raw || "").trim();
  if (!v) return null;
  return v;
}

export function splitInputs(raw: string): string[] {
  return String(raw || "")
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
}
