// === JSON Logic ===

export function stripJsonComments(input: string): string {
  const s = String(input ?? "");
  let out = "";
  let i = 0;
  let inStr = false;
  let esc = false;
  let inLine = false;
  let inBlock = false;
  while (i < s.length) {
    const c = s[i];
    const n = i + 1 < s.length ? s[i + 1] : "";
    if (inLine) {
      if (c === "\n") {
        inLine = false;
        out += c;
      }
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
      out += c;
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      i++;
      continue;
    }
    if (c === '"') {
      inStr = true;
      out += c;
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
    out += c;
    i++;
  }
  return out;
}

export function tryParseJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(stripJsonComments(text)) as unknown };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function isRoutingPath(path: string) {
  return /\/05_routing\.json$/i.test(path) || /routing/i.test(path);
}

export function isOutboundsPath(path: string) {
  return /\/04_outbounds\.json$/i.test(path) || /outbounds/i.test(path);
}

// Extracts the string `tag` of every entry in `outbounds` from a raw JSON(C)
// text (comments-tolerant, via tryParseJson). Returns [] when the text isn't
// valid JSON, has no `outbounds` array, or the array has no string tags.
// De-duplicates while preserving first-seen order.
export function extractOutboundTags(outboundsText: string): string[] {
  const parsed = tryParseJson(outboundsText);
  if (!parsed.ok || !parsed.value || typeof parsed.value !== "object") return [];
  const outbounds = (parsed.value as Record<string, unknown>).outbounds;
  if (!Array.isArray(outbounds)) return [];

  const tags: string[] = [];
  const seen = new Set<string>();
  for (const item of outbounds) {
    if (!item || typeof item !== "object") continue;
    const tag = (item as Record<string, unknown>).tag;
    if (typeof tag === "string" && tag && !seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }
  return tags;
}

export function validateXrayJson(path: string, value: unknown, knownOutboundTags?: string[]): string[] {
  const errs: string[] = [];
  if (!value || typeof value !== "object") {
    errs.push("Root must be a JSON object");
    return errs;
  }
  const obj = value as Record<string, unknown>;
  if (isRoutingPath(path)) {
    const routing = obj.routing;
    if (!routing || typeof routing !== "object") errs.push("Missing object: routing");
    const rules = (routing as Record<string, unknown> | undefined)?.rules;
    if (!Array.isArray(rules)) {
      errs.push("routing.rules must be an array");
    } else if (knownOutboundTags && knownOutboundTags.length > 0) {
      const known = new Set(knownOutboundTags);
      const reported = new Set<string>();
      for (const rule of rules) {
        if (!rule || typeof rule !== "object") continue;
        const tag = (rule as Record<string, unknown>).outboundTag;
        if (typeof tag !== "string" || known.has(tag) || reported.has(tag)) continue;
        reported.add(tag);
        errs.push(`Unknown outboundTag "${tag}" (known: ${knownOutboundTags.join(", ")})`);
      }
    }
  }
  if (isOutboundsPath(path)) {
    const outbounds = obj.outbounds;
    if (!Array.isArray(outbounds)) errs.push("outbounds must be an array");
  }
  return errs;
}

export function countChangedLines(oldText: string, newText: string): number {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  let changed = 0;
  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    if (oldLines[i] !== newLines[i]) changed++;
  }
  return changed;
}
