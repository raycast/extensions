import { Cache } from "@raycast/api";

const IANA_BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json";
const CACHE_KEY = "iana-rdap-bootstrap";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Hardcoded fallbacks for TLDs not in IANA or when fetch fails
const HARDCODED_SERVERS: Record<string, string> = {
  lat: "https://rdap.centralnic.com/lat/",
  academy: "https://rdap.identitydigital.services/rdap/",
  center: "https://rdap.identitydigital.services/rdap/",
};

// --- Types ---

export interface RDAPEvent {
  eventAction: string;
  eventDate: string;
}

export interface RDAPNameserver {
  ldhName?: string;
  unicodeName?: string;
}

export interface RDAPVcardEntry extends Array<unknown> {
  0: string;
  1: Record<string, unknown>;
  2: string;
  3: unknown;
}

export interface RDAPEntity {
  roles: string[];
  vcardArray?: [string, RDAPVcardEntry[]];
  entities?: RDAPEntity[];
  handle?: string;
}

export interface RDAPResponse {
  events?: RDAPEvent[];
  entities?: RDAPEntity[];
  nameservers?: RDAPNameserver[];
  ldhName?: string;
  status?: string[];
}

export interface RDAPDomainData {
  registrationDate?: string | null;
  expirationDate?: string | null;
  lastUpdateDate?: string | null;
  registrar?: string | null;
  registrantName?: string | null;
  nameservers?: string[];
  isAvailable?: boolean;
}

// --- Cache helpers ---

interface BootstrapCache {
  timestamp: number;
  services: [string[], string[]][];
}

function getBootstrapFromCache(cache: Cache): [string[], string[]][] | null {
  const raw = cache.get(CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as BootstrapCache;
    if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
    return parsed.services;
  } catch {
    return null;
  }
}

function setBootstrapToCache(cache: Cache, services: [string[], string[]][]) {
  const payload: BootstrapCache = { timestamp: Date.now(), services };
  cache.set(CACHE_KEY, JSON.stringify(payload));
}

// --- IANA bootstrap resolution ---

async function getAuthRDAPServer(tld: string): Promise<string | null> {
  const cache = new Cache();

  try {
    let services = getBootstrapFromCache(cache);

    if (!services) {
      console.log("[RDAP] Refreshing IANA bootstrap cache...");
      const res = await fetch(IANA_BOOTSTRAP_URL);
      if (res.ok) {
        const data = (await res.json()) as { services?: [string[], string[]][] };
        services = data.services ?? [];
        setBootstrapToCache(cache, services);
      } else {
        console.warn("[RDAP] Failed to fetch IANA bootstrap file");
      }
    }

    if (services) {
      const service = services.find((s) => s[0].includes(tld));
      if (service && service[1] && service[1].length > 0) {
        return service[1][0];
      }
    }
  } catch (e) {
    console.error("[RDAP] Error resolving IANA server:", e);
  }

  return HARDCODED_SERVERS[tld] ?? null;
}

// --- vCard parsing ---

function getNameFromVcard(entity: RDAPEntity): string | null {
  if (!entity.vcardArray || !Array.isArray(entity.vcardArray[1])) return null;
  const fnEntry = entity.vcardArray[1].find((item): item is RDAPVcardEntry => Array.isArray(item) && item[0] === "fn");
  if (!fnEntry || typeof fnEntry[3] !== "string") return null;
  return fnEntry[3];
}

// --- Main RDAP fetch ---

export async function fetchRDAP(domainName: string): Promise<RDAPDomainData | null> {
  try {
    const tld = domainName.split(".").pop()?.toLowerCase() ?? "";

    let rdapBaseUrl = await getAuthRDAPServer(tld);

    if (!rdapBaseUrl) {
      // Identity Digital is a common backend for many new gTLDs
      rdapBaseUrl = "https://rdap.identitydigital.services/rdap/";
    }

    if (!rdapBaseUrl.endsWith("/")) rdapBaseUrl += "/";
    const rdapUrl = `${rdapBaseUrl}domain/${domainName}`;

    console.log(`[RDAP] Querying ${rdapUrl}`);
    const response = await fetch(rdapUrl, {
      headers: { Accept: "application/rdap+json" },
    });

    if (response.status === 404) {
      console.log(`[RDAP] Domain ${domainName} not found (404), marking as available`);
      return { isAvailable: true };
    }

    if (!response.ok) {
      console.warn(`[RDAP] Error ${response.status} for ${rdapUrl}`);
      return null;
    }

    const data = (await response.json()) as RDAPResponse;
    const result: RDAPDomainData = {};

    if (data.events) {
      const regEvent = data.events.find((e) => e.eventAction === "registration");
      const expEvent = data.events.find((e) => e.eventAction === "expiration");
      const updEvent = data.events.find((e) => e.eventAction === "last changed" || e.eventAction === "last update");

      if (regEvent) result.registrationDate = regEvent.eventDate.split("T")[0];
      if (expEvent) result.expirationDate = expEvent.eventDate.split("T")[0];
      if (updEvent) result.lastUpdateDate = updEvent.eventDate.split("T")[0];
    }

    if (data.nameservers) {
      result.nameservers = data.nameservers.map((ns) => ns.ldhName ?? "").filter(Boolean);
    }

    if (data.entities) {
      const registrarEntity = data.entities.find((e) => e.roles?.includes("registrar"));
      const registrantEntity = data.entities.find((e) => e.roles?.includes("registrant"));

      if (registrarEntity) result.registrar = getNameFromVcard(registrarEntity);
      if (registrantEntity) result.registrantName = getNameFromVcard(registrantEntity);
    }

    return result;
  } catch (e) {
    console.warn(`[RDAP] Failed to fetch for ${domainName}`, e);
    return null;
  }
}
