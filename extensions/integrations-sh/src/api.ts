const BASE_URL = "https://integrations.sh";

export type SurfaceKind = "mcp" | "openapi" | "graphql" | "cli";

const SURFACE_KINDS = ["mcp", "openapi", "graphql", "cli"] as const satisfies readonly SurfaceKind[];

export interface SearchResult {
  domain: string;
  name: string;
  description: string;
  kinds: SurfaceKind[];
  url: string;
}

export interface SearchResponse {
  results: SearchResult[];
}

export interface Credential {
  type:
    | "api_key"
    | "basic"
    | "bearer"
    | "oauth2"
    | "oauth2_cc"
    | "oauth1"
    | "jwt"
    | "app"
    | "two_step"
    | "signature"
    | "aws_sigv4"
    | "tba"
    | "compound"
    | "custom";
  label: string;
  generateUrl?: string;
  setup: string;
  acquisition?: "manual" | "ambient";
  fields?: Record<string, { secret?: boolean; description?: string }>;
}

export type AuthStatus =
  { status: "none"; basis?: unknown } | { status: "required"; entries: AuthEntry[] } | { status: "unknown" };

export interface AuthEntry {
  use?: Array<{ id?: string; mechanics?: unknown }>;
  basis?: unknown;
}

export interface SurfacePackage {
  registryType: string;
  identifier: string;
  runtimeHint?: string;
}

export interface Surface {
  slug: string;
  name: string;
  type: "http" | "graphql" | "mcp" | "cli";
  docs?: string;
  auth: AuthStatus;
  basis?: unknown;
  notes?: string;

  // HTTP / GraphQL
  url?: string;
  spec?: string;
  specAlternates?: string[];

  // MCP
  transports?: string[];

  // CLI
  command?: string;
  packages?: SurfacePackage[];
}

export interface SurfaceDocument {
  version: 3;
  domain: string;
  detect?: unknown;
  summary?: string;
  description?: string;
  discoveredAt?: string;
  credentials?: Record<string, Credential>;
  surfaces: Surface[];
  usedLlm?: boolean;
}

export interface DetectionResult {
  domain: string;
  found: string[];
  probed?: string[];
  integrationsJson?: unknown | null;
  apiCatalog?: unknown;
  apiSchema?: unknown;
  auth?: unknown;
  mcp: unknown[];
  agentCard?: unknown;
  agentSkills?: unknown;
  llmsTxt: boolean;
  errors: string[];
}

export type DiscoveryStreamMessage =
  | { event: "progress"; data: { message?: string } }
  | { event: "credential"; data: { id?: string; credential?: Credential } }
  | { event: "surface"; data: Surface }
  | { event: "done"; data: SurfaceDocument }
  | { event: "error"; data: { message?: string } }
  | { event: "message"; data: unknown };

export class IntegrationsHttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new IntegrationsHttpError(response.status, text);
  }

  return response.json() as Promise<T>;
}

export async function searchIntegrations(
  params: { query: string; kind?: SurfaceKind; limit?: number },
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("q", params.query);
  searchParams.set("limit", String(params.limit ?? 20));

  if (params.kind) {
    searchParams.set("kind", params.kind);
  }

  return requestJson<SearchResponse>(`/api/search?${searchParams.toString()}`, { signal });
}

export function isSurfaceKind(value: string): value is SurfaceKind {
  return SURFACE_KINDS.some((kind) => kind === value);
}

export function normalizeDomain(input: string): string {
  let value = input.trim().toLowerCase();
  value = value.replace(/^https?:\/\//, "");
  value = value.replace(/\/.*$/, "");
  return value;
}

export async function getSurface(domain: string, signal?: AbortSignal): Promise<SurfaceDocument> {
  return requestJson<SurfaceDocument>(`/api/${encodeURIComponent(domain)}/surface`, { signal });
}

export async function detectDomain(domain: string, signal?: AbortSignal): Promise<DetectionResult> {
  return requestJson<DetectionResult>(`/api/${encodeURIComponent(domain)}/detect`, { signal });
}

export async function discoverDomain(domain: string, signal?: AbortSignal): Promise<SurfaceDocument> {
  return requestJson<SurfaceDocument>(`/api/${encodeURIComponent(domain)}/discover`, { signal });
}

export async function* discoverDomainStream(
  domain: string,
  signal?: AbortSignal,
): AsyncGenerator<DiscoveryStreamMessage> {
  const response = await fetch(`${BASE_URL}/api/${encodeURIComponent(domain)}/discover/stream`, {
    headers: { accept: "text/event-stream" },
    signal,
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    throw new IntegrationsHttpError(response.status, text);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    if (value) {
      buffer += decoder.decode(value, { stream: true });

      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";

      for (const block of blocks) {
        const message = parseSseBlock(block);
        if (message) {
          yield message;
        }
      }
    }

    if (done) {
      break;
    }
  }

  buffer += decoder.decode();

  if (buffer.trim()) {
    const message = parseSseBlock(buffer);
    if (message) {
      yield message;
    }
  }
}

function parseSseBlock(block: string): DiscoveryStreamMessage | null {
  let event: DiscoveryStreamMessage["event"] = "message";
  let data = "";

  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) {
      event = normalizeDiscoveryEvent(line.slice("event:".length).trim());
    }

    if (line.startsWith("data:")) {
      data += line.slice("data:".length).trim();
    }
  }

  if (!data) {
    return null;
  }

  return { event, data: JSON.parse(data) } as DiscoveryStreamMessage;
}

function normalizeDiscoveryEvent(event: string): DiscoveryStreamMessage["event"] {
  switch (event) {
    case "progress":
    case "credential":
    case "surface":
    case "done":
    case "error":
    case "message":
      return event;
    default:
      return "message";
  }
}

export function domainPageUrl(domain: string): string {
  return `${BASE_URL}/${encodeURIComponent(domain)}/`;
}

export function surfacePageUrl(domain: string, slug: string): string {
  return `${BASE_URL}/${encodeURIComponent(domain)}/${encodeURIComponent(slug)}/`;
}

export function surfaceApiUrl(domain: string): string {
  return `${BASE_URL}/api/${encodeURIComponent(domain)}/surface`;
}

export function openApiUrl(domain: string): string {
  return `${BASE_URL}/api/${encodeURIComponent(domain)}/detect`;
}

export function logoUrl(domain: string, size = 64): string {
  return `${BASE_URL}/logo/${encodeURIComponent(domain)}?sz=${size}`;
}
