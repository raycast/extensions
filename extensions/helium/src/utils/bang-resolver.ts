export interface HeliumBangEntry {
  s: string;
  ts: string[];
  u: string;
  sc?: string;
}

export interface HeliumBang {
  name: string;
  trigger: string;
  templateUrl: string;
  category?: string;
}

export interface ResolvedBang {
  name: string;
  trigger: string;
  query: string;
  url: string;
}

export const FALLBACK_BANGS: HeliumBangEntry[] = [
  { s: "Google", ts: ["g", "google"], u: "https://www.google.com/search?q={searchTerms}" },
  { s: "GitHub", ts: ["gh", "git", "github"], u: "https://github.com/search?q={searchTerms}" },
  {
    s: "Wikipedia",
    ts: ["w", "wi", "wk", "wiki", "wikipedia"],
    u: "https://wikipedia.org/w/index.php?search={searchTerms}",
  },
  {
    s: "Wolfram Alpha",
    ts: ["wa", "wolfram", "wolframalpha"],
    u: "https://www.wolframalpha.com/input?i={searchTerms}",
  },
  { s: "ChatGPT", ts: ["cgpt", "chatgpt"], u: "https://chatgpt.com/?prompt={searchTerms}", sc: "ai" },
  { s: "YouTube", ts: ["yt", "youtube"], u: "https://www.youtube.com/results?search_query={searchTerms}" },
];

export function parseHeliumBangList(text: string): HeliumBangEntry[] {
  const withoutComments = text
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
  const jsonText = withoutComments.replace(/,\s*([\]}])/g, "$1");
  const parsed: unknown = JSON.parse(jsonText);

  if (!Array.isArray(parsed)) {
    throw new Error("Helium bangs response was not an array");
  }

  return parsed.filter(isBangEntry);
}

export function createBangIndex(entries: HeliumBangEntry[]): Map<string, HeliumBang> {
  const index = new Map<string, HeliumBang>();

  for (const entry of entries) {
    for (const trigger of entry.ts) {
      const normalizedTrigger = normalizeTrigger(trigger);
      if (!normalizedTrigger || index.has(normalizedTrigger)) continue;
      index.set(normalizedTrigger, {
        name: entry.s,
        trigger: normalizedTrigger,
        templateUrl: entry.u,
        category: entry.sc,
      });
    }
  }

  return index;
}

export function resolveBangQuery(input: string, index: ReadonlyMap<string, HeliumBang>): ResolvedBang | undefined {
  const invocation = findBangInvocation(input);
  if (!invocation) return undefined;

  const bang = index.get(invocation.trigger);
  if (!bang) return undefined;

  return {
    name: bang.name,
    trigger: bang.trigger,
    query: invocation.query,
    url: applySearchTerms(bang.templateUrl, invocation.query),
  };
}

export function findBangInvocation(input: string): { trigger: string; query: string } | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const tokens = trimmed.split(/\s+/);
  const bangIndex = tokens.findIndex((token) => /^![^\s!]+$/.test(token));
  if (bangIndex === -1) return undefined;

  const trigger = normalizeTrigger(tokens[bangIndex].slice(1));
  if (!trigger) return undefined;

  const query = tokens
    .filter((_, index) => index !== bangIndex)
    .join(" ")
    .trim();

  return { trigger, query };
}

function applySearchTerms(templateUrl: string, query: string): string {
  return templateUrl.replace(/\{searchTerms\}/g, encodeURIComponent(query));
}

function normalizeTrigger(trigger: string): string {
  return trigger.trim().replace(/^!+/, "").toLowerCase();
}

function isBangEntry(value: unknown): value is HeliumBangEntry {
  if (!value || typeof value !== "object") return false;
  const bang = value as Partial<HeliumBangEntry>;
  return typeof bang.s === "string" && Array.isArray(bang.ts) && bang.ts.every(isString) && typeof bang.u === "string";
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
