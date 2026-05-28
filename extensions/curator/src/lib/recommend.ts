import type {
  CatalogEntry,
  DisplaySkill,
  RawRec,
  Recommendation,
} from "./types";

export function firstSentence(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  const stop = t.search(/[.。!?！？]/);
  return stop > 0 ? t.slice(0, stop + 1) : t.slice(0, 80);
}

export function buildCatalog(skills: DisplaySkill[]): CatalogEntry[] {
  return skills.map((s) => ({
    name: s.name,
    desc: firstSentence(s.description),
    triggers: s.primary.triggerHints.slice(0, 4),
    source: s.source.includes("plugin") ? (s.marketplace ?? "plugin") : "user",
  }));
}

export function buildPrompt(query: string, catalog: CatalogEntry[]): string {
  const lines = catalog
    .map((c, i) => {
      const trig = c.triggers.length
        ? ` (triggers: ${c.triggers.join(", ")})`
        : "";
      return `${i + 1}. ${c.name} [${c.source}] — ${c.desc}${trig}`;
    })
    .join("\n");
  return [
    "You help pick the most relevant skills for a user's task from a fixed catalog.",
    `User task: "${query}"`,
    "",
    `Catalog (${catalog.length} skills):`,
    lines,
    "",
    "Return ONLY a JSON array of up to 5 skills, most relevant first:",
    '[{"name":"<exact catalog name>","confidence":"high|medium|low","why":"<=15 words"}]',
    "Rules: use only names that appear verbatim in the catalog; if nothing fits, return [].",
  ].join("\n");
}

export function parseRecommendations(reply: string): RawRec[] {
  const m = reply.match(/\[[\s\S]*\]/);
  if (!m) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(m[0]);
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];
  const out: RawRec[] = [];
  for (const item of arr) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as { name?: unknown }).name === "string"
    ) {
      const o = item as { name: string; confidence?: unknown; why?: unknown };
      out.push({
        name: o.name,
        confidence: typeof o.confidence === "string" ? o.confidence : "medium",
        why: typeof o.why === "string" ? o.why : "",
      });
    }
  }
  return out;
}

function normalizeConfidence(c: string): "high" | "medium" | "low" {
  const v = c.trim().toLowerCase();
  if (v.startsWith("h")) return "high";
  if (v.startsWith("l")) return "low";
  return "medium";
}

export function resolveRecommendations(
  raw: RawRec[],
  skills: DisplaySkill[],
): Recommendation[] {
  const byName = new Map(skills.map((s) => [s.name.toLowerCase(), s]));
  const seen = new Set<string>();
  const out: Recommendation[] = [];
  for (const r of raw) {
    const skill = byName.get(r.name.trim().toLowerCase());
    if (!skill || seen.has(skill.key)) continue;
    seen.add(skill.key);
    out.push({
      skill,
      confidence: normalizeConfidence(r.confidence),
      why: r.why.trim(),
    });
    if (out.length >= 5) break;
  }
  return out;
}
