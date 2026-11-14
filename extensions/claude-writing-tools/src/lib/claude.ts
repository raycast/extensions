import Anthropic from "@anthropic-ai/sdk";
import { MODELS, ModelId, TokenCounts, tokenCost, webSearchCost } from "./models";

export type BetaMessageParam = Anthropic.Beta.BetaMessageParam;
type BetaMessage = Anthropic.Beta.BetaMessage;
type BetaContentBlock = Anthropic.Beta.BetaContentBlock;
type BetaContentBlockParam = Anthropic.Beta.BetaContentBlockParam;
type StreamParams = Parameters<Anthropic["beta"]["messages"]["stream"]>[0];

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface Usage {
  /** Model that produced the final answer (differs from the requested one after a fallback). */
  model: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  webSearches: number;
  cost: number;
}

export interface Source {
  title: string;
  url: string;
}

export interface ClaudeRequest {
  apiKey: string;
  model: ModelId;
  system?: string;
  messages: BetaMessageParam[];
  effort: Effort;
  maxTokens?: number;
  /** JSON schema for structured output; the reply text is then guaranteed to be matching JSON. */
  schema?: Record<string, unknown>;
  webSearch?: boolean;
  /** Multi-turn chat: turns on prompt caching and the preserved-thinking safety net. */
  conversation?: boolean;
  signal?: AbortSignal;
  onText?: (text: string) => void;
  onActivity?: (activity: string | undefined) => void;
}

export interface ClaudeResponse {
  text: string;
  /** Assistant turns exactly as received; append them to the history unchanged. */
  assistantMessages: BetaMessageParam[];
  usage: Usage;
  sources: Source[];
  truncated: boolean;
  durationMs: number;
}

/** The model (and any server-side fallback) declined the request. */
export class RefusalError extends Error {
  readonly category: string | null;

  constructor(category: string | null) {
    super("Claude declined the request");
    this.name = "RefusalError";
    this.category = category;
  }
}

/** Structured output could not be parsed, e.g. because the reply hit max_tokens. */
export class IncompleteResponseError extends Error {
  constructor() {
    super("Claude's reply was incomplete");
    this.name = "IncompleteResponseError";
  }
}

let cachedClient: { apiKey: string; client: Anthropic } | undefined;

function client(apiKey: string): Anthropic {
  if (cachedClient?.apiKey !== apiKey) {
    cachedClient = { apiKey, client: new Anthropic({ apiKey: apiKey.trim(), maxRetries: 2 }) };
  }
  return cachedClient.client;
}

function webSearchTool(): Anthropic.Beta.BetaToolUnion {
  const tool: Anthropic.Beta.BetaWebSearchTool20260209 = {
    type: "web_search_20260209",
    name: "web_search",
    max_uses: 5,
  };
  try {
    const { timeZone, locale } = Intl.DateTimeFormat().resolvedOptions();
    const country = new Intl.Locale(locale).maximize().region;
    tool.user_location = { type: "approximate", timezone: timeZone, ...(country ? { country } : {}) };
  } catch {
    // Location is only a hint for local results.
  }
  return tool;
}

export async function runClaude(req: ClaudeRequest): Promise<ClaudeResponse> {
  const started = Date.now();
  const betas: Anthropic.Beta.AnthropicBeta[] = [];
  const params: Omit<StreamParams, "messages"> = {
    model: req.model,
    max_tokens: req.maxTokens ?? 64000,
    output_config: {
      effort: req.effort,
      ...(req.schema ? { format: { type: "json_schema", schema: req.schema } } : {}),
    },
  };
  if (req.system) params.system = req.system;
  if (MODELS[req.model].fallbacks) {
    // Retries a classifier refusal on Anthropic's recommended model for that category.
    params.fallbacks = "default";
    betas.push("server-side-fallback-2026-07-01");
  }
  if (req.conversation) {
    params.cache_control = { type: "ephemeral" };
    // A stored history that no longer matches its thinking signatures degrades instead of failing.
    params.thinking = { type: "adaptive", block_binding: { prefix_mismatch_behavior: "drop_block" } };
    betas.push("thinking-binding-controls-2026-08-01");
  }
  if (req.webSearch) params.tools = [webSearchTool()];
  if (betas.length) params.betas = betas;

  const history = [...req.messages];
  const assistantMessages: BetaMessageParam[] = [];
  const usage: Usage = { model: req.model, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, webSearches: 0, cost: 0 };
  const sources = new Map<string, Source>();
  let text = "";
  let truncated = false;

  for (let round = 0; ; round++) {
    const stream = client(req.apiKey).beta.messages.stream({ ...params, messages: history }, { signal: req.signal });
    let separate = text.length > 0;
    let busy = false;

    stream.on("streamEvent", (event) => {
      if (event.type !== "content_block_start") return;
      const block = event.content_block;
      if (block.type !== "text" && block.type !== "fallback") separate = true;
      if (block.type === "server_tool_use" && block.name === "web_search") {
        busy = true;
        req.onActivity?.("Searching the web…");
      }
    });
    stream.on("contentBlock", (block) => {
      if (block.type === "server_tool_use" && block.name === "web_search") {
        const query = typeof block.input.query === "string" ? block.input.query : "";
        if (query) req.onActivity?.(`Searching for “${query}”…`);
      } else if (block.type === "web_search_tool_result") {
        req.onActivity?.("Reading results…");
      }
    });
    stream.on("text", (delta) => {
      if (separate && text && !/\s$/.test(text)) text += "\n\n";
      separate = false;
      if (busy) {
        busy = false;
        req.onActivity?.(undefined);
      }
      text += delta;
      req.onText?.(text);
    });

    const message = await stream.finalMessage();
    addUsage(usage, message, req.model);
    collectSources(message.content, sources);
    if (message.stop_reason === "refusal") throw new RefusalError(message.stop_details?.category ?? null);

    const assistant: BetaMessageParam = { role: "assistant", content: replayable(message.content) };
    assistantMessages.push(assistant);
    history.push(assistant);

    // A long server-side tool loop pauses; sending the turn back lets the server resume it.
    if (message.stop_reason === "pause_turn" && round < 4) continue;
    truncated = message.stop_reason === "max_tokens";
    break;
  }

  req.onActivity?.(undefined);
  return {
    text,
    assistantMessages,
    usage,
    sources: [...sources.values()],
    truncated,
    durationMs: Date.now() - started,
  };
}

/** Runs a structured-output request and returns the parsed JSON object. */
export async function runClaudeJson<T>(req: ClaudeRequest & { schema: Record<string, unknown> }): Promise<{
  data: T;
  response: ClaudeResponse;
}> {
  const response = await runClaude(req);
  try {
    return { data: JSON.parse(response.text) as T, response };
  } catch {
    throw new IncompleteResponseError();
  }
}

/**
 * After a mid-output fallback, blocks the declined model produced before the switch can't be
 * replayed: drop its thinking, tool calls and unpaired server tool calls, keep text.
 */
function replayable(content: BetaContentBlock[]): BetaContentBlockParam[] {
  const boundary = content.map((block) => block.type).lastIndexOf("fallback");
  if (boundary < 0) return content;
  const answered = new Set(
    content.flatMap((block) =>
      "tool_use_id" in block && typeof block.tool_use_id === "string" ? [block.tool_use_id] : [],
    ),
  );
  return content.filter((block, index) => {
    if (index >= boundary) return true;
    if (block.type === "server_tool_use") return answered.has(block.id);
    return block.type === "text" || block.type === "web_search_tool_result" || block.type === "web_fetch_tool_result";
  });
}

function counts(u: {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_creation?: { ephemeral_5m_input_tokens: number; ephemeral_1h_input_tokens: number } | null;
}): TokenCounts {
  const write = u.cache_creation_input_tokens ?? 0;
  const write1h = u.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  return {
    input: u.input_tokens ?? 0,
    output: u.output_tokens ?? 0,
    cacheRead: u.cache_read_input_tokens ?? 0,
    cacheWrite5m: Math.max(0, write - write1h),
    cacheWrite1h: write1h,
  };
}

function addUsage(total: Usage, message: BetaMessage, requested: ModelId): void {
  const u = message.usage;
  const attempts = (u.iterations ?? []).flatMap((it) =>
    it.type === "message" || it.type === "fallback_message"
      ? [{ model: (it.model as string | null) ?? requested, tokens: counts(it) }]
      : [],
  );
  const parts = attempts.length ? attempts : [{ model: message.model as string, tokens: counts(u) }];
  for (const { model, tokens } of parts) {
    total.input += tokens.input;
    total.output += tokens.output;
    total.cacheRead += tokens.cacheRead;
    total.cacheWrite += tokens.cacheWrite5m + tokens.cacheWrite1h;
    total.cost += tokenCost(model, tokens);
  }
  const searches = u.server_tool_use?.web_search_requests ?? 0;
  total.webSearches += searches;
  total.cost += webSearchCost(searches);
  total.model = message.model;
}

/**
 * Prefers the pages Claude cited; with dynamic filtering replies often carry no citations, so
 * the top search results stand in for them.
 */
function collectSources(content: BetaContentBlock[], into: Map<string, Source>): void {
  const cited: Source[] = [];
  const found: Source[] = [];
  for (const block of content) {
    if (block.type === "text") {
      for (const citation of block.citations ?? []) {
        if (citation.type === "web_search_result_location") {
          cited.push({ url: citation.url, title: citation.title || hostname(citation.url) });
        }
      }
    } else if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const result of block.content) {
        found.push({ url: result.url, title: result.title || hostname(result.url) });
      }
    }
  }
  for (const source of cited.length ? cited : found.slice(0, 5)) {
    if (!into.has(source.url)) into.set(source.url, source);
  }
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
