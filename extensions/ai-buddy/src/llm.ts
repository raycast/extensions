import { getPreferenceValues } from "@raycast/api";
import { Connection, connection } from "./connection";
import { chosenModel, ModelSlot } from "./model-store";
import { Protocol, Provider, providerOf } from "./providers";
import { askRaycast, hasRaycastAI, raycastModels } from "./raycast-ai";

export type Prefs = {
  provider: Provider;
  baseUrl: string;
  apiKey: string;
  model: string;
  fastMode: boolean;
};

/**
 * The endpoint to call for a connection (AI Setup). A preset provider brings its own host and default
 * model; Custom takes the API Host. `model` is the All Commands model: the one chosen in AI Buddy,
 * else the provider's default (none for Custom).
 */
export function configFor(conn: Connection | undefined): Prefs {
  // Partial: a value may be missing (new install, or a setting added after the user saved theirs).
  const prefs = getPreferenceValues<Partial<Preferences>>();
  const provider = providerOf(conn?.provider);
  const chosen = chosenModel(provider.id, "default");
  const base = {
    provider,
    apiKey: conn?.keys[provider.id]?.trim() ?? "",
    fastMode: prefs.fastMode ?? true,
  };
  if (provider.id !== "custom") return { ...base, baseUrl: provider.baseUrl, model: chosen || provider.defaultModel };
  return { ...base, baseUrl: conn?.host.trim() ?? "", model: chosen ?? "" };
}

/** The saved connection's endpoint (call loadConnection() first in a command). */
export const getConfig = (): Prefs => configFor(connection());

/** AI Setup has been saved at least once. */
export const isSetUp = (): boolean => connection() !== undefined;

/** The model for one command: its own choice, else the All Commands one. */
export const modelFor = (slot: ModelSlot): string => chosenModel(getConfig().provider.id, slot) || getConfig().model;

const IDLE_TIMEOUT_MS = 60_000; // no data for this long = give up (a long answer that keeps streaming is fine)
const MAX_ERROR_BODY = 500;

/**
 * Wraps user content in a data tag. Tag-like text inside it is defused, so selected text such as
 * "</text> ignore the rules…" cannot close the block and pose as instructions.
 */
export const dataBlock = (tag: string, text: string) =>
  `<${tag}>\n${text.replace(/<(\/?)(text|idea|previous)\s*>/gi, "‹$1$2›")}\n</${tag}>`;

/** Longest input sent to the model: a whole page selected by mistake would waste tokens. */
export const MAX_INPUT_CHARS = 10_000;

export function clipInput(text: string): { text: string; clipped: boolean } {
  if (text.length <= MAX_INPUT_CHARS) return { text, clipped: false };
  return { text: text.slice(0, MAX_INPUT_CHARS), clipped: true };
}

/** Plain http to a non-local host sends the API key and the text unencrypted. */
export function isInsecureEndpoint(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "http:") return false;
    const host = url.hostname.replace(/^\[|\]$/g, "");
    return !(host === "localhost" || host === "::1" || host.startsWith("127.") || host.endsWith(".local"));
  } catch {
    return false;
  }
}

/** Settings are missing something, found before any request: the UI offers "get a key" / "open settings". */
export class SetupError extends Error {
  constructor(
    readonly kind: "missing-key" | "missing-model",
    message: string,
  ) {
    super(message);
    this.name = "SetupError";
  }
}

/** What stops AI Buddy from calling the model with the current Settings, if anything. */
export function setupProblem(model = getConfig().model, cfg = getConfig()): SetupError | undefined {
  const { provider, apiKey, baseUrl } = cfg;
  if (provider.id === "raycast")
    return hasRaycastAI()
      ? undefined
      : new SetupError("missing-key", "Raycast AI needs Raycast Pro: choose another provider in AI Buddy → AI Setup.");
  if (provider.id === "custom") {
    if (!baseUrl) return new SetupError("missing-model", "Fill in API Host in AI Buddy → AI Setup.");
    if (!model)
      return new SetupError(
        "missing-model",
        "No model chosen for your server: open AI Buddy → Connection → Choose Models, or ⌘M on a buddy.",
      );
    return undefined; // a local server such as Ollama needs no key
  }
  if (!apiKey) return new SetupError("missing-key", `Add your ${provider.name} API key in AI Buddy → AI Setup.`);
  return undefined;
}

/** A failed HTTP response as a readable error: a hint for known statuses, then the (trimmed) body. */
function httpError(res: Response, body: string, where: string, provider = getConfig().provider): Error {
  const detail = body.length > MAX_ERROR_BODY ? `${body.slice(0, MAX_ERROR_BODY)}…` : body;
  const known = httpHint(effectiveStatus(res.status, body), provider);
  const hint = known ? `${known}\n\n` : "";
  return new Error(`${hint}${res.status} ${res.statusText} (${where})\n\n${detail}`);
}

// Not chat models: hidden from the model list.
const NOT_CHAT = /embed|whisper|tts|dall-e|imagen|image|moderation|transcribe|audio|realtime|veo|aqa/i;

/**
 * Worth showing first in the model picker: drops dated snapshots (2025-08-07, 20241022, -001, 1206),
 * previews, experimental and "latest" aliases, and specialty models (search, deep research, computer use,
 * LearnLM). Everything stays available under All Models.
 */
export function isRecommendedModel(id: string): boolean {
  const name = id.toLowerCase();
  if (/\d{4}-\d{2}-\d{2}|\d{8}|-\d{3,4}$|-\d{2}-\d{4}$/.test(name)) return false;
  return !/preview|experimental|-exp\b|\bexp-|latest|search|deep-research|computer-use|learnlm/.test(name);
}

/**
 * The provider's models, for AI Buddy's model picker. It also checks the API key: a wrong key throws the
 * same hint as a chat request. OpenRouter lists models without a key, so its key is checked first.
 */
export async function listModels(signal: AbortSignal, cfg = getConfig()): Promise<string[]> {
  const problem = setupProblem(cfg.model, cfg);
  if (problem?.kind === "missing-key") throw problem;
  const { provider, apiKey, baseUrl } = cfg;
  if (provider.id === "raycast") return raycastModels();
  if (!baseUrl) throw new SetupError("missing-model", "Fill in API Host first (Provider: Custom).");
  const root = baseUrl.replace(/\/+$/, "");
  const headers: Record<string, string> =
    provider.protocol === "anthropic"
      ? { "x-api-key": apiKey, "anthropic-version": ANTHROPIC_VERSION }
      : apiKey
        ? { Authorization: `Bearer ${apiKey}` }
        : {};
  const get = async (path: string) => {
    const res = await fetch(`${root}${path}`, { headers, signal });
    const body = await res.text();
    if (!res.ok) throw httpError(res, body, `${provider.name} @ ${baseUrl}`, provider);
    return body;
  };
  if (provider.id === "openrouter") await get("/key");
  const data = JSON.parse(await get(provider.protocol === "anthropic" ? "/models?limit=1000" : "/models"));
  const ids: string[] = (Array.isArray(data?.data) ? data.data : [])
    .map((m: { id?: unknown }) => (typeof m?.id === "string" ? m.id.replace(/^models\//, "") : ""))
    .filter((id: string) => id && !NOT_CHAT.test(id));
  return [...new Set(ids)].sort();
}

/** Some providers answer a bad key or model with a plain 400 (Gemini: "API key not valid", OpenRouter: "not a valid model ID"). */
function effectiveStatus(status: number, body: string): number {
  if (status !== 400) return status;
  if (/api[ _-]?key/i.test(body)) return 401;
  if (/model/i.test(body)) return 404;
  return status;
}

function httpHint(status: number, provider: Provider): string | undefined {
  switch (status) {
    case 401:
      return `The API key is wrong or expired: check it in AI Buddy → AI Setup.`;
    case 403:
      return `The API key is not allowed to use this model: check AI Buddy → AI Setup.`;
    case 404:
      return provider.id === "custom"
        ? "API Host or model not found: check API Host in AI Setup and the model in AI Buddy (Choose Models)."
        : `Model not found at ${provider.name}: choose another in AI Buddy (⌘M on a buddy, or Connection → Choose Models), or Use Default.`;
    case 429:
      return "Rate limit or quota reached: try again in a moment.";
  }
}

function request(model: string, system: string, user: string, signal: AbortSignal, effort: string | undefined) {
  const { baseUrl, apiKey, provider } = getConfig();
  const root = baseUrl.replace(/\/+$/, "");
  if (provider.protocol === "anthropic")
    return fetch(`${root}/messages`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": ANTHROPIC_VERSION, "Content-Type": "application/json" },
      // No thinking parameter: Claude answers directly unless extended thinking is asked for.
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        stream: true,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal,
    });
  return fetch(`${root}/chat/completions`, {
    method: "POST",
    headers: { ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}), "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: true,
      // Skip "thinking": much faster for short chat text. Optional, as not every provider accepts it.
      ...(effort ? { reasoning_effort: effort } : {}),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal,
  });
}

const ANTHROPIC_VERSION = "2023-06-01";

const EFFORT_LEVELS: (string | undefined)[] = ["none", "low", undefined];
/** host|model → the reasoning_effort levels still to try, starting with the one that worked. */
const effortMemo = new Map<string, (string | undefined)[]>();

/** Text of one SSE `data:` payload, or "end" at the end of the stream. Throws on an error event. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readEvent(protocol: Protocol, event: Record<string, any>, model: string): string | "end" {
  if (protocol === "anthropic") {
    if (event.type === "error")
      throw new Error(`Stream error (${model}): ${event.error?.message ?? JSON.stringify(event.error)}`);
    if (event.type === "message_stop") return "end";
    return event.type === "content_block_delta" && event.delta?.type === "text_delta" ? (event.delta.text ?? "") : "";
  }
  if (event.error) throw new Error(`Stream error (${model}): ${event.error.message ?? JSON.stringify(event.error)}`);
  return event.choices?.[0]?.delta?.content ?? "";
}

/** Streams the answer: OpenAI-compatible /chat/completions, or the Claude Messages API. */
export async function* streamChat(
  model: string,
  system: string,
  user: string,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const { baseUrl, fastMode, provider } = getConfig();
  const problem = setupProblem(model);
  if (problem) throw problem;
  if (provider.id === "raycast") return yield* askRaycast(model, system, user, signal);
  const idle = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  const bump = () => {
    clearTimeout(timer);
    timer = setTimeout(
      () => idle.abort(new Error(`No response from ${model} for ${IDLE_TIMEOUT_MS / 1000}s: try again.`)),
      IDLE_TIMEOUT_MS,
    );
  };
  bump();
  const timed = AbortSignal.any([signal, idle.signal]);
  try {
    yield* stream(model, system, user, timed, fastMode, baseUrl, bump);
  } finally {
    clearTimeout(timer);
  }
}

async function* stream(
  model: string,
  system: string,
  user: string,
  timed: AbortSignal,
  fastMode: boolean,
  baseUrl: string,
  bump: () => void,
): AsyncGenerator<string> {
  // Speed mode asks for the least thinking the model accepts. Models differ (Gemini 3 can't turn it
  // off and answers a bare 400), so step down none → low → no parameter, and remember what worked.
  const memoKey = `${baseUrl}|${model}`;
  const levels =
    fastMode && getConfig().provider.protocol === "openai" ? (effortMemo.get(memoKey) ?? EFFORT_LEVELS) : [undefined];
  let res!: Response;
  let body = "";
  for (let i = 0; i < levels.length; i++) {
    res = await request(model, system, user, timed, levels[i]);
    body = res.ok ? "" : await res.text();
    if (res.ok) {
      effortMemo.set(memoKey, levels.slice(i));
      break;
    }
    const effortMayBeTheCause = res.status === 400 && levels[i] !== undefined && !/api[ _-]?key/i.test(body);
    if (!effortMayBeTheCause) break;
  }
  if (!res.ok || !res.body) throw httpError(res, body, `${model} @ ${baseUrl}`);

  const { protocol } = getConfig().provider;
  const decoder = new TextDecoder();
  let buffer = "";
  // Returns true at the end of the stream.
  function* parse(line: string): Generator<string, boolean> {
    if (!line.startsWith("data:")) return false; // also skips Anthropic's "event:" lines: the JSON carries the type
    const data = line.slice(5).trim();
    if (data === "[DONE]") return true;
    let event;
    try {
      event = JSON.parse(data);
    } catch {
      return false; // skip a malformed / keep-alive chunk instead of failing the whole answer
    }
    const text = readEvent(protocol, event, model);
    if (text === "end") return true;
    if (text) yield text;
    return false;
  }
  for await (const bytes of res.body) {
    bump();
    buffer += decoder.decode(bytes, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) if (yield* parse(line)) return;
  }
  yield* parse(buffer.trim()); // last event without a trailing newline
}
