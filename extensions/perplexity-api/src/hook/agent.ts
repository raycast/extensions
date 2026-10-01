import OpenAI from "openai";

// Perplexity's Agent API. The OpenAI SDK's responses.create() posts to `${baseURL}/responses`,
// which Perplexity accepts as an alias for /v1/agent, so the base URL must include /v1.
export const AGENT_BASE_URL = "https://api.perplexity.ai/v1";

export const PRESETS = ["fast", "low", "medium", "high", "xhigh"];

// Sonar model slugs, mapped to the presets Perplexity's migration guide suggests,
// so a preference saved before this version keeps working.
export const SONAR_TO_PRESET: Record<string, string> = {
  sonar: "fast",
  "sonar-pro": "fast",
  "sonar-reasoning": "low",
  "sonar-reasoning-pro": "low",
  "sonar-deep-research": "high",
};

// anthropic/* models require max_output_tokens.
export const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

export type Citation = { id: number; url: string };
export type Turn = { role: "user" | "assistant"; content: string };
export type SearchFilters = {
  search_domain_filter?: string[];
  search_recency_filter?: string;
};
type WebSearchTool = { type: "web_search"; filters?: SearchFilters };

export type AgentRequest = {
  preset?: string;
  model?: string;
  instructions?: string;
  input: { type: "message"; role: Turn["role"]; content: string }[];
  stream?: boolean;
  temperature?: number;
  max_output_tokens?: number;
  tools?: WebSearchTool[];
};

type OutputItem = {
  type: string;
  content?: { type: string; text?: string }[];
  results?: { id: number; url: string }[];
};
export type AgentResponse = {
  model?: string;
  output?: OutputItem[];
  output_text?: string;
  usage?: { cost?: { total_cost?: number } };
};
type StreamEvent = { type: string; delta?: string; response?: AgentResponse };

export function resolveTarget(id: string): { preset: string } | { model: string } {
  const mapped = SONAR_TO_PRESET[id] ?? id;
  return PRESETS.includes(mapped) ? { preset: mapped } : { model: mapped };
}

// Whether a request for this target carries a temperature. Presets and anthropic/* models take none,
// so the UI offers and shows a temperature only when this is true.
export function sendsTemperature(id: string): boolean {
  const target = resolveTarget(id);
  return "model" in target && !target.model.startsWith("anthropic/");
}

// The name of the target actually sent. A saved Sonar slug shows the preset it now runs as.
export function targetLabel(id: string, models: { id: string; name: string }[]): string {
  const target = resolveTarget(id);
  const sent = "preset" in target ? target.preset : target.model;
  const name = models.find((m) => m.id === sent)?.name ?? sent;
  return sent === id ? name : `${name} (from ${id})`;
}

export function buildAgentRequest(opts: {
  target: string;
  instructions?: string;
  turns: Turn[];
  stream?: boolean;
  temperature?: number;
  filters?: SearchFilters;
}): AgentRequest {
  const target = resolveTarget(opts.target);
  const request: AgentRequest = {
    ...target,
    input: opts.turns.map((t) => ({ type: "message", role: t.role, content: t.content })),
  };
  if (opts.instructions) request.instructions = opts.instructions;
  if (opts.stream) request.stream = true;

  const filters = opts.filters && dropUndefined(opts.filters);
  if ("model" in target) {
    // A request that names a model directly searches the web only if it adds the tool.
    request.tools = [filters ? { type: "web_search", filters } : { type: "web_search" }];
    if (target.model.startsWith("anthropic/")) request.max_output_tokens = DEFAULT_MAX_OUTPUT_TOKENS;
    if (sendsTemperature(opts.target) && opts.temperature !== undefined) request.temperature = opts.temperature;
  } else if (filters) {
    // Presets already search; the tool entry only carries the filters.
    request.tools = [{ type: "web_search", filters }];
  }
  return request;
}

function dropUndefined(filters: SearchFilters): SearchFilters | undefined {
  const out: SearchFilters = {};
  if (filters.search_domain_filter?.length) out.search_domain_filter = filters.search_domain_filter;
  if (filters.search_recency_filter) out.search_recency_filter = filters.search_recency_filter;
  return Object.keys(out).length ? out : undefined;
}

// The answer text. Throws on a body that is not an Agent response (e.g. an old chat-completion
// shape), so a wrong endpoint fails loudly instead of rendering an empty answer.
export function textOf(response: AgentResponse): string {
  if (typeof response.output_text === "string") return response.output_text;
  const messages = (response.output ?? []).filter((item) => item.type === "message");
  if (!messages.length) throw new Error("Unexpected response from Perplexity: no message in output");
  return messages
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text")
    .map((part) => part.text ?? "")
    .join("");
}

// Sources live in the output item of type "search_results"; each [n] marker maps to the result with id n.
export function citationsOf(response: AgentResponse): Citation[] {
  return (response.output ?? [])
    .filter((item) => item.type === "search_results")
    .flatMap((item) => item.results ?? [])
    .map((r) => ({ id: r.id, url: r.url }))
    .sort((a, b) => a.id - b.id);
}

// Actual cost in US dollars, as reported by the API.
export function costOf(response: AgentResponse): number | undefined {
  return response.usage?.cost?.total_cost;
}

export async function createAgentResponse(client: OpenAI, request: AgentRequest): Promise<AgentResponse> {
  const body = { ...request, stream: false } as unknown as OpenAI.Responses.ResponseCreateParamsNonStreaming;
  return (await client.responses.create(body)) as unknown as AgentResponse;
}

// Streams the answer, calling onText with the text so far. Returns the completed response,
// whose text replaces the assembled deltas if the two differ.
export async function streamAgentResponse(
  client: OpenAI,
  request: AgentRequest,
  onText: (text: string) => void,
): Promise<{ text: string; response: AgentResponse }> {
  const body = { ...request, stream: true } as unknown as OpenAI.Responses.ResponseCreateParamsStreaming;
  const stream = (await client.responses.create(body)) as unknown as AsyncIterable<StreamEvent>;
  return consumeAgentStream(stream, onText);
}

export async function consumeAgentStream(
  stream: AsyncIterable<StreamEvent>,
  onText: (text: string) => void,
): Promise<{ text: string; response: AgentResponse }> {
  let text = "";
  for await (const event of stream) {
    if (event.type === "response.output_text.delta") {
      text += event.delta ?? "";
      onText(text);
    } else if (event.type === "response.completed" && event.response) {
      const final = textOf(event.response);
      if (final !== text) {
        text = final;
        onText(text);
      }
      return { text, response: event.response };
    } else if (event.type === "response.failed" || event.type === "error") {
      throw new Error(`Perplexity stream ${event.type}`);
    }
  }
  throw new Error("Perplexity stream ended without response.completed");
}

// Runs a request with or without streaming and returns text, sources and cost.
export async function runAgent(
  client: OpenAI,
  request: AgentRequest,
  onText?: (text: string) => void,
): Promise<{ text: string; citations: Citation[]; cost?: number }> {
  if (request.stream) {
    const { text, response } = await streamAgentResponse(client, request, onText ?? (() => undefined));
    return { text, citations: citationsOf(response), cost: costOf(response) };
  }
  const response = await createAgentResponse(client, request);
  const text = textOf(response);
  onText?.(text);
  return { text, citations: citationsOf(response), cost: costOf(response) };
}
