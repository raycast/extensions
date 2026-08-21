import { getPreferenceValues } from "@raycast/api";
import { describeCall, runTool, TOOL_SPECS, ToolContext } from "./tools";

export interface Preferences {
  baseUrl: string;
  model: string;
  apiKey: string;
  maxTokens: string;
  temperature: string;
  systemPrompt: string;
  showReasoning: boolean;
  fallbackBaseUrl: string;
  fallbackModel: string;
  preferredEndpoint: string;
  enableTools: boolean;
  maxToolRounds: string;
  cloudProvider: string;
  cloudApiKey: string;
  cloudModel: string;
  searxngUrl: string;
  ragUrl: string;
  ragApiKey: string;
  ragCollection: string;
  firecrawlUrl: string;
}

export function toolContext(p: Preferences): ToolContext {
  return {
    searxngUrl: p.searxngUrl || "",
    ragUrl: p.ragUrl || "",
    ragApiKey: p.ragApiKey || "",
    ragCollection: p.ragCollection || "",
    firecrawlUrl: p.firecrawlUrl || "",
  };
}

/**
 * Qwen publishes different sampling for thinking vs non-thinking mode, and the two
 * endpoints run in different modes: Calypso 2 has `--reasoning on`, Calypso 1 has
 * `--reasoning off`. Sending one profile to both degrades whichever it doesn't match.
 */
export interface Sampling {
  temperature: number;
  top_p: number;
  top_k: number;
  min_p: number;
  presence_penalty: number;
  repetition_penalty: number;
}

/** Sampling for a reasoning/thinking model. */
export const THINKING: Sampling = {
  temperature: 1.0,
  top_p: 0.95,
  top_k: 20,
  min_p: 0,
  presence_penalty: 0,
  repetition_penalty: 1.0,
};

/** Sampling for a plain instruct model. */
export const INSTRUCT: Sampling = {
  temperature: 0.7,
  top_p: 0.8,
  top_k: 20,
  min_p: 0,
  presence_penalty: 1.5,
  repetition_penalty: 1.0,
};

export interface Endpoint {
  baseUrl: string;
  model: string;
  label: string;
  sampling: Sampling;
  /** Cloud providers authenticate with their own key, not the local one. */
  apiKey?: string;
  /** Cloud endpoints serve no /health and no llama.cpp timings — skip both. */
  isCloud?: boolean;
}

/** llama.cpp reports speculative-decoding counters in the final SSE chunk. */
export interface Timings {
  prompt_n?: number;
  prompt_per_second?: number;
  predicted_n?: number;
  predicted_per_second?: number;
  draft_n?: number;
  draft_n_accepted?: number;
}

export interface StreamEvent {
  content?: string;
  reasoning?: string;
  timings?: Timings;
  done?: boolean;
  /** A tool the model decided to call, e.g. `web_search("…")`. */
  toolCall?: string;
  /** Short outcome line for that call, so a run stays auditable. */
  toolResult?: string;
}

/** Streamed tool-call fragments arrive piecewise — `arguments` is concatenated. */
interface PendingCall {
  id: string;
  name: string;
  args: string;
}

export type ChatMessage = {
  role: string;
  content: string | null;
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
};

export function prefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

/** OpenAI-compatible cloud providers usable as a last-resort fallback. */
const CLOUD: Record<string, { base: string; label: string; model: string }> = {
  // gpt-oss-120b verified live against the paid Cerebras account 2026-08-16. The previous
  // default (llama-3.3-70b) is NOT in that account's /v1/models list, so the fallback 404'd.
  cerebras: { base: "https://api.cerebras.ai/v1", label: "Cerebras", model: "gpt-oss-120b" },
  groq: { base: "https://api.groq.com/openai/v1", label: "Groq", model: "llama-3.3-70b-versatile" },
  inception: { base: "https://api.inceptionlabs.ai/v1", label: "Inception", model: "mercury-coder" },
};

export function calypso2(p: Preferences): Endpoint {
  // The primary endpoint is assumed to be the reasoning-capable one.
  return { baseUrl: trimSlash(p.baseUrl), model: p.model || "calypso-2", label: "Primary", sampling: THINKING };
}

export function calypso1(p: Preferences): Endpoint {
  return {
    baseUrl: trimSlash(p.fallbackBaseUrl),
    model: p.fallbackModel || "calypso-1",
    label: "Fallback",
    // The fallback is assumed to be an instruct model, so no think block is expected.
    sampling: INSTRUCT,
  };
}

/** The configured cloud fallback, or null when the user picked "none"/left the key blank. */
export function cloudEndpoint(p: Preferences): Endpoint | null {
  const key = (p.cloudProvider || "none").trim().toLowerCase();
  const spec = CLOUD[key];
  // A provider without a key would fail with an opaque 401 mid-stream; treat it as unset.
  if (!spec || !p.cloudApiKey) return null;
  return {
    baseUrl: spec.base,
    model: (p.cloudModel || "").trim() || spec.model,
    label: `${spec.label} · cloud`,
    // Cloud models are plain instruct endpoints; the local thinking budget does not apply.
    sampling: INSTRUCT,
    apiKey: p.cloudApiKey,
    isCloud: true,
  };
}

/**
 * Ordered candidates for a run.
 *
 * `target` pins one rig, which is what the per-model commands use: "Ask Calypso 1" must
 * never silently answer from Calypso 2, or the command name is a lie. The cloud endpoint
 * is appended last for every target so a sleeping rig degrades instead of failing.
 */
export function endpoints(p: Preferences, target: string = "auto"): Endpoint[] {
  const t = (target || "auto").trim().toLowerCase();
  const two = calypso2(p);
  const one = calypso1(p);
  const cloud = cloudEndpoint(p);
  const list: Endpoint[] = [];

  if (t === "calypso-1") list.push(one);
  else if (t === "calypso-2") list.push(two);
  else {
    // "auto" prefers the primary endpoint and falls back to the secondary one.
    list.push(two);
    if (p.fallbackBaseUrl && trimSlash(p.fallbackBaseUrl) !== trimSlash(p.baseUrl)) list.push(one);
    const pick = (p.preferredEndpoint || "auto").trim().toLowerCase();
    if (pick === "calypso-1" || pick === "calypso-2") {
      list.sort((a, b) => (a.model === pick ? -1 : b.model === pick ? 1 : 0));
    }
  }

  if (cloud) list.push(cloud);
  return list.filter((e) => e.baseUrl);
}

function trimSlash(u: string): string {
  return (u || "").trim().replace(/\/+$/, "");
}

function headers(p: Preferences, ep?: Endpoint): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  // A cloud endpoint carries its own key; the local key must not leak to a third party.
  const key = ep?.apiKey ?? p.apiKey;
  if (key) h.Authorization = `Bearer ${key}`;
  return h;
}

/**
 * The server runs with `--reasoning on --reasoning-budget 800`, so the think block is
 * charged against max_tokens before a single answer token is emitted. Anything under
 * ~1200 reliably returns `content: ""` with finish_reason "length".
 */
function resolveMaxTokens(p: Preferences): number {
  const n = Number.parseInt(p.maxTokens, 10);
  if (!Number.isFinite(n) || n <= 0) return 4096;
  return Math.max(n, 1500);
}

export async function health(ep: Endpoint, p: Preferences, timeoutMs = 8000): Promise<boolean> {
  // Cloud providers serve no /health; probing one would 404 and wrongly mark it down.
  // Treat a configured cloud endpoint as available and let the request itself surface errors.
  if (ep.isCloud) return true;
  const root = ep.baseUrl.replace(/\/v1$/, "");
  try {
    const res = await withTimeout((signal) => fetch(`${root}/health`, { headers: headers(p, ep), signal }), timeoutMs);
    return res.ok;
  } catch {
    return false;
  }
}

export interface Props {
  model?: string;
  contextSize?: number;
  trainedContext?: number;
  params?: number;
  sizeBytes?: number;
}

export async function props(ep: Endpoint, p: Preferences, timeoutMs = 10000): Promise<Props | null> {
  try {
    const res = await withTimeout(
      (signal) => fetch(`${ep.baseUrl}/models`, { headers: headers(p, ep), signal }),
      timeoutMs,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: Array<{ id?: string; meta?: { n_ctx?: number; n_ctx_train?: number; n_params?: number; size?: number } }>;
    };
    const first = json.data?.[0];
    if (!first) return null;
    return {
      model: first.id,
      contextSize: first.meta?.n_ctx,
      trainedContext: first.meta?.n_ctx_train,
      params: first.meta?.n_params,
      sizeBytes: first.meta?.size,
    };
  } catch {
    return null;
  }
}

function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fn(ctrl.signal).finally(() => clearTimeout(timer));
}

/**
 * Streams an OpenAI-compatible completion. llama.cpp b9852 emits clean SSE:
 * `delta.content` for the answer, `delta.reasoning_content` for the think block,
 * a final chunk carrying `timings`, then `data: [DONE]`.
 */
export async function* stream(
  ep: Endpoint,
  p: Preferences,
  prompt: string,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  yield* streamOnce(ep, p, buildMessages(p, prompt), false, [], signal);
}

/** Same as `stream`, but for a conversation that already has history. */
export async function* streamMessages(
  ep: Endpoint,
  p: Preferences,
  messages: ChatMessage[],
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  yield* streamOnce(ep, p, messages, false, [], signal);
}

/** Seed conversation: optional system prompt, then the user's question. */
export function buildMessages(p: Preferences, prompt: string): ChatMessage[] {
  const messages: ChatMessage[] = [];
  if (p.systemPrompt?.trim()) messages.push({ role: "system", content: p.systemPrompt.trim() });
  messages.push({ role: "user", content: prompt });
  return messages;
}

/**
 * One request/response turn. When `withTools` is set the model may answer with
 * `tool_calls` instead of prose; those fragments are accumulated into `pending`
 * for the caller to execute, because a generator cannot cleanly return a value
 * while also yielding progress.
 */
async function* streamOnce(
  ep: Endpoint,
  p: Preferences,
  messages: ChatMessage[],
  withTools: boolean,
  pending: PendingCall[],
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const temperature = Number.parseFloat(p.temperature);

  const res = await fetch(`${ep.baseUrl}/chat/completions`, {
    method: "POST",
    headers: headers(p, ep),
    signal,
    body: JSON.stringify({
      model: ep.model,
      messages,
      max_tokens: resolveMaxTokens(p),
      // Per-endpoint Qwen official sampling; the Temperature preference overrides it if set.
      ...ep.sampling,
      temperature: Number.isFinite(temperature) ? temperature : ep.sampling.temperature,
      ...(withTools ? { tools: TOOL_SPECS, tool_choice: "auto" } : {}),
      stream: true,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${ep.label} returned HTTP ${res.status}. ${detail.slice(0, 300)}`);
  }
  if (!res.body) throw new Error(`${ep.label} returned an empty body.`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line; keep the trailing partial frame.
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          if (payload === "[DONE]") {
            yield { done: true };
            return;
          }
          let chunk: {
            choices?: Array<{
              delta?: {
                content?: string | null;
                reasoning_content?: string | null;
                tool_calls?: Array<{
                  index?: number;
                  id?: string;
                  function?: { name?: string; arguments?: string };
                }>;
              };
            }>;
            timings?: Timings;
          };
          try {
            chunk = JSON.parse(payload);
          } catch {
            // A truncated frame is not fatal — the next read completes it.
            continue;
          }
          const delta = chunk.choices?.[0]?.delta;

          // Tool calls stream in fragments keyed by index: the id and name land in the
          // first fragment, then `arguments` accumulates across many.
          for (const tc of delta?.tool_calls ?? []) {
            const i = tc.index ?? 0;
            if (!pending[i]) pending[i] = { id: "", name: "", args: "" };
            if (tc.id) pending[i].id = tc.id;
            if (tc.function?.name) pending[i].name = tc.function.name;
            if (tc.function?.arguments) pending[i].args += tc.function.arguments;
          }

          const event: StreamEvent = {};
          if (delta?.content) event.content = delta.content;
          if (delta?.reasoning_content) event.reasoning = delta.reasoning_content;
          if (chunk.timings) event.timings = chunk.timings;
          if (event.content || event.reasoning || event.timings) yield event;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  yield { done: true };
}

/** Nudges the model to check the private knowledge base before reaching for the open web. */
const TOOL_GUIDANCE =
  "You have tools: rag_search (the user's private knowledge base), web_search (live web via " +
  "SearXNG) and fetch_url (read a page as markdown). Prefer rag_search for anything about the " +
  "user's own systems, projects or history; use web_search for current or public facts. " +
  "Call a tool instead of guessing, then answer from what you got and cite URLs when you used them.";

function clampRounds(raw: string): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return 4;
  return Math.min(n, 8);
}

/**
 * Tool-enabled turn loop. Streams prose as it arrives; when the model emits
 * `tool_calls` instead, runs them, appends the results and asks again. Falls back
 * to a plain single stream when tools are disabled or the endpoint rejects them.
 */
/**
 * Single-shot entry point, kept for the Ask commands: one prompt in, one answer
 * out, no memory of anything before it.
 */
export async function* runAgent(
  ep: Endpoint,
  p: Preferences,
  prompt: string,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  yield* runConversation(ep, p, buildMessages(p, prompt), signal);
}

/**
 * The same tool loop, but seeded with an existing conversation instead of a
 * single prompt. This is what makes follow-up questions work: the caller owns
 * the transcript and passes the whole thing back each turn, so "what about the
 * second one?" resolves against what was already said — and against whatever
 * web_search or rag_search returned earlier in the thread.
 *
 * `history` must already contain the new user turn as its last message. It is
 * copied, not mutated, so a failed turn cannot corrupt the caller's transcript.
 */
export async function* runConversation(
  ep: Endpoint,
  p: Preferences,
  history: ChatMessage[],
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  if (!p.enableTools) {
    yield* streamMessages(ep, p, history, signal);
    return;
  }

  const ctx = toolContext(p);
  const messages: ChatMessage[] = history.map((m) => ({ ...m }));
  // Prepend guidance without clobbering a user-set system prompt.
  if (messages[0]?.role === "system") {
    messages[0].content = `${messages[0].content}\n\n${TOOL_GUIDANCE}`;
  } else {
    messages.unshift({ role: "system", content: TOOL_GUIDANCE });
  }

  const maxRounds = clampRounds(p.maxToolRounds);

  for (let round = 0; ; round++) {
    const pending: PendingCall[] = [];
    try {
      for await (const ev of streamOnce(ep, p, messages, true, pending, signal)) {
        if (ev.done) break;
        yield ev;
      }
    } catch (e) {
      // A server built without --jinja rejects `tools`; degrade instead of dying.
      if (round === 0) {
        yield { toolResult: `tools unavailable (${(e as Error).message.slice(0, 80)}) — answering without them` };
        yield* streamMessages(ep, p, history, signal);
        return;
      }
      throw e;
    }

    const calls = pending.filter((c) => c && c.name);
    if (calls.length === 0) {
      yield { done: true };
      return;
    }

    if (round >= maxRounds) {
      yield { toolResult: `stopped after ${maxRounds} tool rounds` };
      yield { done: true };
      return;
    }

    messages.push({
      role: "assistant",
      content: null,
      tool_calls: calls.map((c, i) => ({
        id: c.id || `call_${round}_${i}`,
        type: "function" as const,
        function: { name: c.name, arguments: c.args || "{}" },
      })),
    });

    for (const [i, c] of calls.entries()) {
      yield { toolCall: describeCall(c.name, c.args) };
      const out = await runTool(c.name, c.args, ctx);
      const firstLine = out.split("\n").find((l) => l.trim()) ?? "";
      yield { toolResult: `${out.length} chars — ${firstLine.slice(0, 90)}` };
      messages.push({ role: "tool", tool_call_id: c.id || `call_${round}_${i}`, content: out });
    }
  }
}

export function formatTimings(t: Timings): string {
  const bits: string[] = [];
  if (t.predicted_per_second) bits.push(`${t.predicted_per_second.toFixed(1)} tok/s`);
  if (t.predicted_n) bits.push(`${t.predicted_n} tokens`);
  if (t.draft_n && t.draft_n > 0) {
    const pct = ((t.draft_n_accepted ?? 0) / t.draft_n) * 100;
    bits.push(`MTP ${pct.toFixed(0)}%`);
  }
  return bits.join(" · ");
}

export function humanBytes(n?: number): string {
  if (!n) return "—";
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function humanCount(n?: number): string {
  if (!n) return "—";
  return `${(n / 1e9).toFixed(2)}B`;
}
