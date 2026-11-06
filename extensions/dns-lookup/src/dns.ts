import { Resolver } from "node:dns/promises";

// --- TYPES ---
export type Transport = "auto" | "doh" | "udp";
export type RecordType = "A" | "AAAA" | "CNAME" | "MX" | "NS" | "TXT" | "SOA" | "SRV";
export type Via = "DoH" | "UDP";

export interface LookupResult {
  status: "success" | "warning" | "error";
  records: string[];
  // Shown instead of the records when there are none
  message?: string;
  via: Via;
}

export interface FastResolver {
  id: string;
  name: string;
  serverInfo: string;
  // Used for the provider logo
  website?: string;
  lookup: (domain: string, type: RecordType, signal: AbortSignal) => Promise<LookupResult>;
}

interface DohProvider {
  id: string;
  name: string;
  ip: string;
  url: string;
  website: string;
}

interface DohResponse {
  Status: number;
  Answer?: { data: string; type: number }[];
  Authority?: { data: string; type: number }[];
}

// --- CONSTANTS ---
export const RECORD_TYPES: RecordType[] = ["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA", "SRV"];

const TYPE_CODES: Record<RecordType, number> = { A: 1, NS: 2, CNAME: 5, SOA: 6, MX: 15, TXT: 16, AAAA: 28, SRV: 33 };

const DOH_PROVIDERS: DohProvider[] = [
  { id: "google", name: "Google", ip: "8.8.8.8", url: "https://dns.google/resolve", website: "https://www.google.com" },
  {
    id: "cloudflare",
    name: "Cloudflare",
    ip: "1.1.1.1",
    url: "https://cloudflare-dns.com/dns-query",
    website: "https://www.cloudflare.com",
  },
  {
    id: "dnssb",
    name: "DNS.SB",
    ip: "185.222.222.222",
    url: "https://doh.dns.sb/dns-query",
    website: "https://dns.sb",
  },
  {
    id: "alidns",
    name: "Alibaba",
    ip: "223.5.5.5",
    url: "https://dns.alidns.com/resolve",
    website: "https://www.alidns.com",
  },
];

const DOH_TIMEOUT_MS = 4000;
// About 3 seconds in total, retry included
const UDP_OPTIONS = { timeout: 1000, tries: 2 };

const DOH_RCODES: Record<number, string> = { 1: "FORMERR", 2: "SERVFAIL", 3: "NXDOMAIN", 4: "NOTIMP", 5: "REFUSED" };
const UDP_ERRORS: Record<string, string> = {
  ENOTFOUND: "NXDOMAIN",
  ESERVFAIL: "SERVFAIL",
  EREFUSED: "REFUSED",
  ENOTIMP: "NOTIMP",
  EFORMERR: "FORMERR",
  ETIMEOUT: "Timeout",
};

// Providers whose DoH endpoint failed during this session: Auto goes straight to UDP for them
const dohUnreachable = new Set<string>();

// --- FORMATTING ---
export const normalizeDomain = (input: string): string | null => {
  const domain = input
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.+$/, "");
  return domain.includes(".") ? domain : null;
};

const formatSoa = (serial: string | number, minimumTtl: string | number) => `Serial: ${serial} | TTL: ${minimumTtl}`;

export const sortRecords = (records: string[]) =>
  [...records].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

// Decodes a TXT string in presentation format: \DDD is a decimal byte, \X a literal character
const decodeTxtString = (text: string) =>
  Buffer.concat(
    Array.from(text.matchAll(/\\(\d{3})|\\([^])|[^\\]+/gu), ([match, byte, char]) =>
      byte ? Buffer.from([Number(byte)]) : Buffer.from(char ?? match),
    ),
  ).toString("utf8");

// Converts presentation format (DoH, dig) to the format produced by the UDP resolver
export const formatRecord = (type: RecordType, data: string): string => {
  if (type === "TXT") {
    const chunks = data.match(/"(?:[^"\\]|\\.)*"/g);
    return chunks ? chunks.map((chunk) => decodeTxtString(chunk.slice(1, -1))).join("") : data;
  }
  const parts = data.split(" ").map((part) => part.replace(/\.$/, ""));
  if (type === "SOA" && parts.length >= 7) return formatSoa(parts[2], parts[6]);
  return parts.join(" ");
};

const failure = (reason: string, via: Via): LookupResult =>
  reason === "NXDOMAIN"
    ? { status: "warning", records: [], message: "Not found (NXDOMAIN)", via }
    : { status: "error", records: [], message: reason, via };

// --- DNS OVER HTTPS ---
const lookupDoh = async (
  provider: DohProvider,
  domain: string,
  type: RecordType,
  signal: AbortSignal,
): Promise<LookupResult> => {
  const response = await fetch(`${provider.url}?${new URLSearchParams({ name: domain, type })}`, {
    headers: { Accept: "application/dns-json" },
    signal: AbortSignal.any([signal, AbortSignal.timeout(DOH_TIMEOUT_MS)]),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = (await response.json()) as DohResponse;
  if (data.Status !== 0) return failure(DOH_RCODES[data.Status] ?? `RCODE ${data.Status}`, "DoH");

  const code = TYPE_CODES[type];
  let records = (data.Answer ?? []).filter((record) => record.type === code);
  // Names without their own SOA get the zone SOA in the authority section
  if (records.length === 0 && type === "SOA") {
    records = (data.Authority ?? []).filter((record) => record.type === code);
  }
  return { status: "success", records: records.map((record) => formatRecord(type, record.data)), via: "DoH" };
};

// --- CLASSIC DNS (UDP 53) ---
// Walks up to the zone apex to match the authority SOA returned over DoH
const resolveZoneSoa = async (resolver: Resolver, domain: string) => {
  let name = domain;
  for (;;) {
    try {
      return await resolver.resolveSoa(name);
    } catch (error) {
      const parent = name.slice(name.indexOf(".") + 1);
      if ((error as NodeJS.ErrnoException).code !== "ENODATA" || !parent.includes(".")) throw error;
      name = parent;
    }
  }
};

const queryUdp = async (resolver: Resolver, domain: string, type: RecordType): Promise<string[]> => {
  switch (type) {
    case "A":
      return resolver.resolve4(domain);
    case "AAAA":
      return resolver.resolve6(domain);
    case "CNAME":
      return resolver.resolveCname(domain);
    case "NS":
      return resolver.resolveNs(domain);
    case "MX":
      return (await resolver.resolveMx(domain)).map((record) => `${record.priority} ${record.exchange}`);
    case "TXT":
      // Node decodes TXT bytes as latin1, while TXT data is usually UTF-8
      return (await resolver.resolveTxt(domain)).map((chunks) =>
        Buffer.from(chunks.join(""), "latin1").toString("utf8"),
      );
    case "SOA": {
      const soa = await resolveZoneSoa(resolver, domain);
      return [formatSoa(soa.serial, soa.minttl)];
    }
    case "SRV":
      return (await resolver.resolveSrv(domain)).map(
        (record) => `${record.priority} ${record.weight} ${record.port} ${record.name}`,
      );
  }
};

// Without servers, the resolver uses the ones configured on the system
const lookupUdp = async (
  servers: string[] | null,
  domain: string,
  type: RecordType,
  signal: AbortSignal,
): Promise<LookupResult> => {
  const resolver = new Resolver(UDP_OPTIONS);
  if (servers) resolver.setServers(servers);
  const cancel = () => resolver.cancel();
  signal.addEventListener("abort", cancel, { once: true });

  try {
    return { status: "success", records: await queryUdp(resolver, domain, type), via: "UDP" };
  } catch (error) {
    signal.throwIfAborted();
    const code = (error as NodeJS.ErrnoException).code ?? "";
    if (code === "ENODATA") return { status: "success", records: [], via: "UDP" };
    return failure(UDP_ERRORS[code] ?? "Unavailable", "UDP");
  } finally {
    signal.removeEventListener("abort", cancel);
  }
};

// --- RESOLVERS ---
const lookupProvider = async (
  provider: DohProvider,
  transport: Transport,
  domain: string,
  type: RecordType,
  signal: AbortSignal,
): Promise<LookupResult> => {
  if (transport === "udp" || (transport === "auto" && dohUnreachable.has(provider.id))) {
    return lookupUdp([provider.ip], domain, type, signal);
  }

  try {
    return await lookupDoh(provider, domain, type, signal);
  } catch (error) {
    signal.throwIfAborted();
    if (transport === "doh") {
      return failure(error instanceof Error && error.name === "TimeoutError" ? "Timeout" : "Unavailable", "DoH");
    }
    dohUnreachable.add(provider.id);
    return lookupUdp([provider.ip], domain, type, signal);
  }
};

export const getFastResolvers = (transport: Transport): FastResolver[] => [
  ...DOH_PROVIDERS.map((provider) => ({
    id: provider.id,
    name: provider.name,
    serverInfo: provider.ip,
    website: provider.website,
    lookup: (domain: string, type: RecordType, signal: AbortSignal) =>
      lookupProvider(provider, transport, domain, type, signal),
  })),
  {
    id: "system",
    name: "System DNS",
    serverInfo: new Resolver().getServers().join(", ") || "OS default",
    lookup: (domain, type, signal) => lookupUdp(null, domain, type, signal),
  },
];
