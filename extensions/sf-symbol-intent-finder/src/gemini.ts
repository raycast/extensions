import { LocalStorage } from "@raycast/api";
import { getSymbol, SFSymbol } from "./data";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const CACHE_PREFIX = "ai:";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_RESULTS = 18;

type CacheEntry = { ts: number; names: string[] };

/** Raised when no key is configured, so the UI shows the setup hint instead of an error. */
export class MissingKeyError extends Error {}

/** Raised when Gemini rejects a configured key, so the UI can point at Preferences. */
export class InvalidKeyError extends Error {}

function cacheKey(model: string, query: string): string {
  return `${CACHE_PREFIX}${model}:${query.trim().toLowerCase()}`;
}

async function readCache(key: string): Promise<string[] | undefined> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return undefined;
  try {
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      await LocalStorage.removeItem(key);
      return undefined;
    }
    return entry.names;
  } catch {
    return undefined;
  }
}

async function writeCache(key: string, names: string[]): Promise<void> {
  const entry: CacheEntry = { ts: Date.now(), names };
  await LocalStorage.setItem(key, JSON.stringify(entry));
}

function buildPrompt(query: string): string {
  return [
    "You are an expert on Apple's SF Symbols catalog.",
    "The user is searching for an icon by INTENT or meaning, not by its literal name.",
    `The user's query is: "${query}".`,
    `Return up to ${MAX_RESULTS} real SF Symbol names whose meaning or common use matches this intent,`,
    "ordered from best to weakest match.",
    "Use exact lowercase dotted identifiers (for example: arrow.uturn.backward, trash, square.and.arrow.up).",
    "Only include symbols you are confident actually exist. Do not invent names. Do not add explanations.",
  ].join(" ");
}

/** Map of validated names that survived catalog lookup, preserving model order. */
function validate(names: unknown): SFSymbol[] {
  if (!Array.isArray(names)) return [];
  const seen = new Set<string>();
  const result: SFSymbol[] = [];
  for (const raw of names) {
    if (typeof raw !== "string") continue;
    const name = raw.trim();
    if (seen.has(name)) continue;
    const symbol = getSymbol(name);
    if (symbol) {
      seen.add(name);
      result.push(symbol);
    }
  }
  return result;
}

/**
 * Ask Gemini for SF Symbols matching the query's intent, validate every
 * suggestion against the local catalog, and cache the (validated) names.
 * Throws MissingKeyError when no key is configured, or Error on API failure.
 */
export async function intentSearch(
  query: string,
  apiKey: string,
  model: string,
  signal: AbortSignal,
): Promise<SFSymbol[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  if (!apiKey) throw new MissingKeyError("No Gemini API key configured");

  const key = cacheKey(model, trimmed);
  const cached = await readCache(key);
  if (cached) return validate(cached);

  const response = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(trimmed) }] }],
      generationConfig: {
        temperature: 0.2,
        // Listing symbol names needs no reasoning; Gemini 3's default "thinking"
        // mode adds ~9s of latency here, so disable it. Ignored by models that
        // don't support thinking.
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: { symbols: { type: "array", items: { type: "string" } } },
          required: ["symbols"],
        },
      },
    }),
  });

  if (response.status === 400 || response.status === 401 || response.status === 403) {
    throw new InvalidKeyError(`Gemini rejected the request (${response.status}). Check your API key.`);
  }
  if (response.status === 404) {
    throw new Error(`Model "${model}" not found. Check the AI Model preference.`);
  }
  if (!response.ok) {
    throw new Error(`Gemini request failed (${response.status})`);
  }

  const json = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  let names: unknown = [];
  try {
    names = (JSON.parse(text) as { symbols?: unknown }).symbols ?? [];
  } catch {
    names = [];
  }

  const validated = validate(names);
  await writeCache(
    key,
    validated.map((s) => s.name),
  );
  return validated;
}
