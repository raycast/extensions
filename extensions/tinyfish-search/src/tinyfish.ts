import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport, StreamableHTTPError } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CallToolResultSchema, type CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export type Authentication = { type: "api-key"; token: string } | { type: "oauth"; token: string };

export const MAX_SEARCH_PAGE = 10;
export const fetchFormatSchema = z.enum(["markdown", "html", "json"]);
export type FetchFormat = z.infer<typeof fetchFormatSchema>;

const calendarDate = z.iso.date();
const dateRangeSchema = z
  .object({ kind: z.literal("dates"), after: calendarDate.optional(), before: calendarDate.optional() })
  .refine(
    (range) => !range.after || !range.before || range.after <= range.before,
    "Start date must not follow end date.",
  );
const timeFilterSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("any") }),
  z.object({ kind: z.literal("recent"), minutes: z.number().int().min(1).max(5256000) }),
  dateRangeSchema,
]);
export const purposeSchema = z.string().trim().min(1).max(2000);
export const selectorsSchema = z.array(z.string().trim().min(1).max(1000)).min(1).max(20);
const domains = {
  includeDomains: z.string().optional(),
  excludeDomains: z.string().optional(),
  purpose: purposeSchema.optional(),
};
export const searchFiltersSchema = z.discriminatedUnion("type", [
  z.object({ type: z.enum(["web", "news"]), time: timeFilterSchema, ...domains }),
  z
    .object({
      type: z.literal("research_paper"),
      yearFrom: z.number().int().min(0).max(9999).optional(),
      yearTo: z.number().int().min(0).max(9999).optional(),
      ...domains,
    })
    .refine(
      (range) => range.yearFrom === undefined || range.yearTo === undefined || range.yearFrom <= range.yearTo,
      "Start year must not follow end year.",
    ),
]);
export type SearchFilters = z.infer<typeof searchFiltersSchema>;
export const DEFAULT_SEARCH_FILTERS: SearchFilters = { type: "web", time: { kind: "any" } };

export const fetchOptionsSchema = z.object({
  urls: z.array(z.httpUrl()).min(1, "Enter at least one URL.").max(10, "Fetch up to 10 URLs at a time."),
  format: fetchFormatSchema.default("markdown"),
  links: z.boolean().default(false),
  image_links: z.boolean().default(false),
  ttl: z.number().int().nonnegative().optional(),
  purpose: purposeSchema.optional(),
  include_selectors: selectorsSchema.optional(),
  exclude_selectors: selectorsSchema.optional(),
});
export type FetchOptions = z.input<typeof fetchOptionsSchema>;

const searchResultSchema = z.object({
  position: z.number(),
  site_name: z.string().nullish(),
  title: z.string(),
  snippet: z.string().nullish(),
  url: z.string(),
  date: z.string().nullish(),
  publisher: z.string().nullish(),
  authors: z.array(z.string()).nullish(),
  venue: z.string().nullish(),
  year: z.number().nullish(),
  cited_by_count: z.number().nullish(),
  pdf_url: z.string().nullish(),
});

const searchResponseSchema = z.object({ results: z.array(searchResultSchema) });

export const fetchResultSchema = z.object({
  url: z.string(),
  final_url: z.string().nullish(),
  title: z.string().nullish(),
  description: z.string().nullish(),
  language: z.string().nullish(),
  author: z.string().nullish(),
  published_date: z.string().nullish(),
  text: z.union([z.string(), z.record(z.string(), z.unknown())]),
  latency_ms: z.number().nullish(),
  format: fetchFormatSchema.optional(),
  links: z.array(z.string()).nullish(),
  image_links: z.array(z.string()).nullish(),
  unmatched_selectors: z.array(z.string()).optional(),
});

const fetchErrorSchema = z.object({
  url: z.string(),
  error: z.string(),
  status: z.number().nullish(),
  unmatched_selectors: z.array(z.string()).optional(),
  candidate_selectors: z.array(z.string()).optional(),
});
export type FetchError = z.infer<typeof fetchErrorSchema>;
const fetchResponseSchema = z.object({
  results: z.array(fetchResultSchema),
  errors: z.array(fetchErrorSchema).default([]),
});

export type SearchResult = z.infer<typeof searchResultSchema>;
export type FetchResult = z.infer<typeof fetchResultSchema>;

type RequestOptions = { authentication: Authentication; signal: AbortSignal };

export async function searchTinyFish({
  query,
  location,
  language,
  filters,
  page,
  authentication,
  signal,
}: RequestOptions & { query: string; location?: string; language?: string; filters?: SearchFilters; page?: number }) {
  const parameters: Record<string, string | number> = { query };
  if (location?.trim()) parameters.location = location.trim();
  if (language?.trim()) parameters.language = language.trim();
  if (page !== undefined) parameters.page = z.number().int().min(0).max(MAX_SEARCH_PAGE).parse(page);
  if (filters) {
    const parsed = searchFiltersSchema.parse(filters);
    parameters.domain_type = parsed.type;
    if (parsed.purpose) parameters.purpose = parsed.purpose;
    if (parsed.includeDomains?.trim()) parameters.include_domains = parsed.includeDomains.trim();
    if (parsed.excludeDomains?.trim()) parameters.exclude_domains = parsed.excludeDomains.trim();
    if (parsed.type === "research_paper") {
      if (parsed.yearFrom !== undefined) parameters.pub_year_min = parsed.yearFrom;
      if (parsed.yearTo !== undefined) parameters.pub_year_max = parsed.yearTo;
    } else if (parsed.time.kind === "recent") {
      parameters.recency_minutes = parsed.time.minutes;
    } else if (parsed.time.kind === "dates") {
      if (parsed.time.after) parameters.after_date = parsed.time.after;
      if (parsed.time.before) parameters.before_date = parsed.time.before;
    }
  }

  const data =
    authentication.type === "oauth"
      ? await callTool({ name: "search", parameters, authentication, signal })
      : await requestJSON(
          `https://api.search.tinyfish.ai?${new URLSearchParams(Object.entries(parameters).map(([key, value]) => [key, String(value)]))}`,
          {
            headers: { "X-API-Key": authentication.token },
            signal,
          },
        );

  return parseResponse(searchResponseSchema, data);
}

export async function fetchTinyFishPages({ authentication, signal, ...options }: RequestOptions & FetchOptions) {
  const parameters = fetchOptionsSchema.parse(options);
  const data =
    authentication.type === "oauth"
      ? await callTool({ name: "fetch_content", parameters, authentication, signal })
      : await requestJSON("https://api.fetch.tinyfish.ai", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-API-Key": authentication.token },
          body: JSON.stringify(parameters),
          signal,
        });

  return parseResponse(fetchResponseSchema, data);
}

async function requestJSON(url: string, options: RequestInit): Promise<unknown> {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "Your TinyFish API key was rejected. Update it in extension preferences."
        : `TinyFish request failed (${response.status} ${response.statusText}).`,
    );
  }
  return response.json();
}

async function callTool({
  name,
  parameters,
  authentication,
  signal,
}: RequestOptions & { name: "search" | "fetch_content"; parameters: Record<string, unknown> }): Promise<unknown> {
  signal.throwIfAborted();
  const client = new Client({ name: "tinyfish-search-raycast", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL("https://agent.tinyfish.ai/mcp"), {
    requestInit: { headers: { Authorization: `Bearer ${authentication.token}` } },
    fetch: (url, init) =>
      fetch(url, { ...init, signal: init?.signal ? AbortSignal.any([signal, init.signal]) : signal }),
  });

  try {
    await client.connect(transport, { signal });
    const result = await client.request(
      { method: "tools/call", params: { name, arguments: parameters } },
      CallToolResultSchema,
      { signal, timeout: name === "fetch_content" ? 150000 : 60000 },
    );
    return readToolResult(result);
  } catch (error) {
    if (error instanceof StreamableHTTPError && error.code === 401) {
      throw new Error(
        "TinyFish authorization was rejected. Sign out in extension preferences, then reopen the command.",
      );
    }
    throw error;
  } finally {
    await client.close();
  }
}

function readToolResult(result: CallToolResult): unknown {
  const text = result.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n");
  if (result.isError) {
    throw new Error(text || "TinyFish could not complete the request.");
  }
  if (result.structuredContent) return result.structuredContent;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("TinyFish returned an unreadable response. Try again.");
  }
}

function parseResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new Error("TinyFish returned an unexpected response. Try again.");
  return parsed.data;
}
