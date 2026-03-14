import {
  PaginatedResponse,
  Pagination,
  SearchInput,
  SmitheryServer,
  SmitheryServerDetail,
  SmitherySkill,
  SmitherySkillDetail,
} from "./types";

const API_BASE_URL = "https://api.smithery.ai";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

const FETCH_TIMEOUT_MS = 15_000;

async function fetchJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, FETCH_TIMEOUT_MS);

  // If a caller-provided signal exists, abort our controller when it fires
  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      if (timedOut) {
        throw new Error(
          `Smithery API request timed out after ${FETCH_TIMEOUT_MS / 1000}s`,
        );
      }
      // Caller's signal fired — propagate as-is so the caller can identify cancellations
      throw error;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let bodySnippet = "";
    try {
      const text = await response.text();
      bodySnippet = text.length > 200 ? `${text.slice(0, 200)}...` : text;
    } catch {
      // ignore body read failures
    }
    const detail = bodySnippet ? `: ${bodySnippet}` : "";
    throw new Error(
      `Smithery API request failed (${response.status})${detail}`,
    );
  }

  return response.json();
}

function parsePagination(raw: unknown): Pagination {
  const data = asRecord(raw);

  const currentPage = asNumber(data.currentPage) ?? 1;
  const pageSize = asNumber(data.pageSize) ?? 0;
  const totalPages = asNumber(data.totalPages) ?? 1;
  const totalCount = asNumber(data.totalCount) ?? 0;

  return {
    currentPage,
    pageSize,
    totalPages,
    totalCount,
  };
}

function parseServer(raw: unknown): SmitheryServer {
  const data = asRecord(raw);

  return {
    id: asString(data.id),
    qualifiedName: asString(data.qualifiedName) ?? "",
    namespace: asString(data.namespace),
    slug: asString(data.slug),
    displayName:
      asString(data.displayName) ?? asString(data.qualifiedName) ?? "Unknown",
    description: asString(data.description),
    iconUrl: asString(data.iconUrl),
    verified: asBoolean(data.verified) ?? false,
    useCount: asNumber(data.useCount),
    remote: asBoolean(data.remote),
    isDeployed: asBoolean(data.isDeployed),
    createdAt: asString(data.createdAt),
    homepage: asString(data.homepage),
    owner: asString(data.owner),
    score: asNumber(data.score),
  };
}

function parseServerDetail(raw: unknown): SmitheryServerDetail {
  const data = asRecord(raw);
  const base = parseServer(raw);
  const security = asRecord(data.security);

  const connections = Array.isArray(data.connections)
    ? data.connections.map((entry) => {
        const connection = asRecord(entry);
        const configSchema = asRecord(connection.configSchema);

        return {
          type: asString(connection.type),
          configSchema: {
            type: asString(configSchema.type),
            properties: asRecord(configSchema.properties),
            required: asStringArray(configSchema.required),
          },
        };
      })
    : [];

  const tools = Array.isArray(data.tools)
    ? data.tools.map((entry) => {
        const tool = asRecord(entry);
        return {
          name: asString(tool.name) ?? "unknown",
          description: asString(tool.description),
          inputSchema: asRecord(tool.inputSchema),
        };
      })
    : [];

  return {
    ...base,
    deploymentUrl: asString(data.deploymentUrl),
    connections,
    security: {
      scanPassed: asBoolean(security.scanPassed),
    },
    tools,
    resources: Array.isArray(data.resources)
      ? data.resources.map((entry) => asRecord(entry))
      : [],
    prompts: Array.isArray(data.prompts)
      ? data.prompts.map((entry) => asRecord(entry))
      : [],
    eventTopics: Array.isArray(data.eventTopics)
      ? data.eventTopics.map((entry) => asRecord(entry))
      : [],
  };
}

function parseSkill(raw: unknown): SmitherySkill {
  const data = asRecord(raw);

  return {
    id: asString(data.id),
    namespace: asString(data.namespace) ?? "",
    slug: asString(data.slug) ?? "",
    displayName: asString(data.displayName) ?? asString(data.slug) ?? "Unknown",
    description: asString(data.description),
    categories: asStringArray(data.categories),
    qualityScore: asNumber(data.qualityScore),
    totalActivations: asNumber(data.totalActivations),
    externalStars: asNumber(data.externalStars),
    reviewCount: asNumber(data.reviewCount),
    upvotes: asNumber(data.upvotes),
    downvotes: asNumber(data.downvotes),
    verified: asBoolean(data.verified) ?? false,
    listed: asBoolean(data.listed),
    createdAt: asString(data.createdAt),
    gitUrl: asString(data.gitUrl),
    servers: asStringArray(data.servers),
  };
}

function parseSkillDetail(raw: unknown): SmitherySkillDetail {
  const data = asRecord(raw);
  const base = parseSkill(raw);

  return {
    ...base,
    prompt: asString(data.prompt),
    externalForks: asNumber(data.externalForks),
    uniqueUsers: asNumber(data.uniqueUsers),
    owner: asString(data.owner),
  };
}

function parsePaginated<T>(
  raw: unknown,
  listKey: "servers" | "skills",
  parser: (entry: unknown) => T,
): PaginatedResponse<T> {
  const data = asRecord(raw);
  const pagination = parsePagination(data.pagination);
  const entries = Array.isArray(data[listKey]) ? data[listKey] : [];

  return {
    data: entries.map((entry) => parser(entry)),
    pagination,
    hasMore: pagination.currentPage < pagination.totalPages,
  };
}

export async function searchServers({
  q,
  page,
  pageSize,
  signal,
}: SearchInput) {
  const query = new URLSearchParams({
    q,
    page: String(page),
    pageSize: String(pageSize),
  });

  const json = await fetchJson(`/servers?${query.toString()}`, signal);
  return parsePaginated(json, "servers", parseServer);
}

export async function getServerDetail(qualifiedName: string) {
  const encodedName = encodeURIComponent(qualifiedName);
  const json = await fetchJson(`/servers/${encodedName}`);
  return parseServerDetail(json);
}

export async function getServerSummary(qualifiedName: string) {
  const normalized = qualifiedName.toLowerCase();
  const [namespacePart, slugPart] = normalized.split("/", 2);

  const fetchVariant = async (queryValue: string) => {
    const query = new URLSearchParams({
      q: queryValue,
      page: "1",
      pageSize: "10",
    });
    const json = await fetchJson(`/servers?${query.toString()}`);
    const parsed = parsePaginated(json, "servers", parseServer);
    return parsed.data.find(
      (server) => server.qualifiedName.toLowerCase() === normalized,
    );
  };

  // 1. Try the full normalized name first (single request)
  const primary = await fetchVariant(normalized);
  if (primary) return primary;

  // 2. Fall back to slug and namespace variants in parallel
  const fallbackVariants = Array.from(
    new Set(
      [slugPart, namespacePart]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

  const results = await Promise.all(fallbackVariants.map(fetchVariant));
  return results.find(Boolean);
}

export async function getServerDetailWithSummary(qualifiedName: string) {
  const [detail, summary] = await Promise.all([
    getServerDetail(qualifiedName),
    getServerSummary(qualifiedName).catch((error) => {
      console.error(
        `[smithery] Failed to fetch summary for "${qualifiedName}":`,
        error,
      );
      return undefined;
    }),
  ]);

  if (!summary) {
    return detail;
  }

  // Explicitly typed overlay so TypeScript catches any new SmitheryServer
  // fields that are not being merged from the summary.
  const summaryOverride: Partial<SmitheryServer> = {
    id: summary.id ?? detail.id,
    namespace: summary.namespace ?? detail.namespace,
    slug: summary.slug ?? detail.slug,
    verified: summary.verified,
    useCount: summary.useCount ?? detail.useCount,
    isDeployed: summary.isDeployed ?? detail.isDeployed,
    createdAt: summary.createdAt ?? detail.createdAt,
    homepage: summary.homepage ?? detail.homepage,
    owner: summary.owner ?? detail.owner,
    score: summary.score ?? detail.score,
  };

  return { ...detail, ...summaryOverride };
}

export async function searchSkills({ q, page, pageSize, signal }: SearchInput) {
  const query = new URLSearchParams({
    q,
    page: String(page),
    pageSize: String(pageSize),
  });

  const json = await fetchJson(`/skills?${query.toString()}`, signal);
  return parsePaginated(json, "skills", parseSkill);
}

export async function getSkillDetail(namespace: string, slug: string) {
  const encodedNamespace = encodeURIComponent(namespace);
  const encodedSlug = encodeURIComponent(slug);
  const json = await fetchJson(`/skills/${encodedNamespace}/${encodedSlug}`);
  return parseSkillDetail(json);
}
