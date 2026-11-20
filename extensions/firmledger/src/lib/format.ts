export type Obj = Record<string, any>;

const indent = (s: string) =>
  s
    .split("\n")
    .map((l) => `  ${l}`)
    .join("\n");

function scalar(v: unknown): string {
  if (typeof v === "string") return v.includes("\n") ? "\n" + indent("```\n" + v + "\n```") : v;
  return String(v);
}

/** Readable markdown for arbitrary JSON payloads. */
export function toMarkdown(v: unknown): string {
  if (v === null || v === undefined) return "_none_";
  if (typeof v !== "object") return scalar(v);
  if (Array.isArray(v)) {
    if (!v.length) return "_empty_";
    return v.map((x, i) => (x && typeof x === "object" ? `- **#${i + 1}**\n${indent(toMarkdown(x))}` : `- ${scalar(x)}`)).join("\n");
  }
  const entries = Object.entries(v as Obj);
  if (!entries.length) return "_empty_";
  return entries
    .map(([k, val]) =>
      val && typeof val === "object" ? `- **${k}:**\n${indent(toMarkdown(val))}` : `- **${k}:** ${val === null ? "_none_" : scalar(val)}`,
    )
    .join("\n");
}

export function json(v: unknown): string {
  return "```json\n" + JSON.stringify(v, null, 2) + "\n```";
}

export function pick(o: Obj | undefined, keys: string[]): string | undefined {
  if (!o) return undefined;
  for (const k of keys) {
    const v = o[k];
    if (v !== undefined && v !== null && v !== "" && typeof v !== "object") return String(v);
  }
  return undefined;
}

/** First array of objects in a payload (or the payload itself if an array). */
export function extractArray(data: unknown, preferred: string[] = []): Obj[] {
  if (Array.isArray(data)) return data.map((x) => (x && typeof x === "object" ? x : { value: x }));
  if (data && typeof data === "object") {
    const o = data as Obj;
    for (const k of preferred) if (Array.isArray(o[k])) return extractArray(o[k]);
    for (const v of Object.values(o)) if (Array.isArray(v) && v.length && typeof v[0] === "object") return v;
    for (const v of Object.values(o)) if (Array.isArray(v)) return extractArray(v);
  }
  return [];
}

export interface Link {
  label: string;
  url: string;
}

/** Collect http(s) URLs in a payload; checkout/upgrade links first. */
export function collectLinks(data: unknown, max = 8): Link[] {
  const found: Link[] = [];
  const walk = (v: unknown, key: string, depth: number) => {
    if (depth > 6 || found.length > 40) return;
    if (typeof v === "string") {
      const m = v.match(/^https?:\/\/\S+$/);
      if (m && !found.some((f) => f.url === v)) found.push({ label: key, url: v });
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, key, depth + 1));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v as Obj)) walk(x, k, depth + 1);
  };
  walk(data, "link", 0);
  const rank = (l: Link) => (/checkout|upgrade|claim|submit|sign|connect/i.test(l.label) ? 0 : 1);
  return found.sort((a, b) => rank(a) - rank(b)).slice(0, max);
}

export function findCsv(data: unknown): string | undefined {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const o = data as Obj;
    for (const k of ["csv", "content", "text", "data"]) if (typeof o[k] === "string") return o[k];
    for (const v of Object.values(o)) if (typeof v === "string" && v.includes("\n") && v.includes(",")) return v;
  }
  return undefined;
}

export function listingRef(item: Obj): string | undefined {
  return pick(item, ["slug", "listing_slug", "id", "listing_id", "name"]);
}
