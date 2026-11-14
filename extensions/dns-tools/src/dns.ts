export const RECORD_TYPES = [
  "A",
  "AAAA",
  "CAA",
  "CNAME",
  "MX",
  "NS",
  "SOA",
  "SRV",
  "TXT",
  "HTTPS",
  "SVCB",
  "DS",
  "DNSKEY",
] as const;
export type RecordType = (typeof RECORD_TYPES)[number];
export type RecordSelection = RecordType | "ALL";

export type DnsRecord = { data: string; ttl: number };
export type ResolverResult =
  | { resolver: string; kind: "answer"; records: DnsRecord[] }
  | {
      resolver: string;
      kind:
        | "no-record"
        | "nxdomain"
        | "dns-error"
        | "http-error"
        | "timeout"
        | "network-error";
      detail: string;
    };

const RESOLVERS = [
  { name: "Google Public DNS", url: "https://dns.google/resolve" },
  { name: "Cloudflare 1.1.1.1", url: "https://cloudflare-dns.com/dns-query" },
] as const;

const TYPE_CODES: Record<RecordType, number> = {
  A: 1,
  NS: 2,
  CNAME: 5,
  SOA: 6,
  MX: 15,
  TXT: 16,
  AAAA: 28,
  SRV: 33,
  DS: 43,
  DNSKEY: 48,
  CAA: 257,
  SVCB: 64,
  HTTPS: 65,
};

export function normalizeDomain(input: string): string {
  const domain = input.trim().replace(/\.$/, "").toLowerCase();
  if (domain.length < 1 || domain.length > 253 || !domain.includes("."))
    throw new Error("Enter a valid domain name.");
  const labels = domain.split(".");
  if (
    labels.some(
      (label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label),
    )
  ) {
    throw new Error(
      "Enter a valid domain name using letters, numbers, dots, and hyphens.",
    );
  }
  return domain;
}

function normalizeRecord(data: string, type: RecordType): string {
  const trimmed = data.trim();
  if (type === "TXT") {
    const quoted = trimmed.match(/^"((?:[^"\\]|\\.)*)"$/);
    if (quoted) {
      try {
        return JSON.parse(trimmed) as string;
      } catch {
        return quoted[1];
      }
    }
    return trimmed;
  }
  return trimmed.replace(/\.$/, "").toLowerCase().replace(/\s+/g, " ");
}

export function answersMatch(
  results: ResolverResult[],
  type: RecordType,
): boolean | undefined {
  if (
    results.some(
      (result) => result.kind !== "answer" && result.kind !== "no-record",
    )
  )
    return undefined;
  const signatures = results.map((result) =>
    result.kind === "answer"
      ? [
          ...new Set(
            result.records.map((record) => normalizeRecord(record.data, type)),
          ),
        ]
          .sort()
          .join("\u0000")
      : "",
  );
  return (
    signatures.length > 1 &&
    signatures.every((signature) => signature === signatures[0])
  );
}

type DnsResponse = {
  Status?: number;
  Answer?: { type?: number; TTL?: number; data?: string }[];
};

async function queryResolver(
  resolver: (typeof RESOLVERS)[number],
  domain: string,
  type: RecordType,
  fetcher: typeof fetch,
): Promise<ResolverResult> {
  const url = new URL(resolver.url);
  url.searchParams.set("name", domain);
  url.searchParams.set("type", type);
  try {
    const response = await fetcher(url, {
      headers: { Accept: "application/dns-json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok)
      return {
        resolver: resolver.name,
        kind: "http-error",
        detail: `HTTP ${response.status}`,
      };
    const body = (await response.json()) as DnsResponse;
    if (body.Status === 3)
      return {
        resolver: resolver.name,
        kind: "nxdomain",
        detail: "Domain does not exist (NXDOMAIN).",
      };
    if (body.Status !== 0)
      return {
        resolver: resolver.name,
        kind: "dns-error",
        detail: `DNS response code ${body.Status ?? "missing"}.`,
      };
    const records = (body.Answer ?? [])
      .filter(
        (answer) =>
          answer.type === TYPE_CODES[type] && typeof answer.data === "string",
      )
      .map((answer) => ({ data: answer.data as string, ttl: answer.TTL ?? 0 }));
    if (records.length === 0)
      return {
        resolver: resolver.name,
        kind: "no-record",
        detail: `No ${type} record found.`,
      };
    return { resolver: resolver.name, kind: "answer", records };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    return {
      resolver: resolver.name,
      kind:
        name === "TimeoutError" || name === "AbortError"
          ? "timeout"
          : "network-error",
      detail:
        name === "TimeoutError" || name === "AbortError"
          ? "Request timed out."
          : "Could not reach resolver.",
    };
  }
}

export async function checkDns(
  domain: string,
  type: RecordType,
  fetcher: typeof fetch = fetch,
): Promise<ResolverResult[]> {
  const normalized = normalizeDomain(domain);
  return Promise.all(
    RESOLVERS.map((resolver) =>
      queryResolver(resolver, normalized, type, fetcher),
    ),
  );
}

export async function checkAllDns(
  domain: string,
  fetcher: typeof fetch = fetch,
): Promise<{ type: RecordType; results: ResolverResult[] }[]> {
  const normalized = normalizeDomain(domain);
  return Promise.all(
    RECORD_TYPES.map(async (type) => ({
      type,
      results: await checkDns(normalized, type, fetcher),
    })),
  );
}
