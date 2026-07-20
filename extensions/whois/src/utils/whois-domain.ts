import * as whoiser from "whoiser";
import { fetchRDAP } from "@/utils/rdap";

export interface DomainDates {
  registrationDate: string | null;
  expirationDate: string | null;
  lastUpdateDate: string | null;
  registrar: string | null;
  registrantName: string | null;
  nameservers: string[];
  isPrivate: boolean;
  isAvailable: boolean;
  rawText?: string;
}

// Custom WHOIS servers for specific TLDs that need explicit routing
const TLD_SERVERS: Record<string, string> = {
  academy: "whois.nic.academy",
  center: "whois.nic.center",
  dev: "whois.nic.google",
};

// Keywords that indicate a domain is not registered
const NOT_FOUND_KEYWORDS = [
  "no match",
  "not found",
  "no_se_encontro",
  "no se encontro",
  "available",
  "free",
  "object_not_found",
];

const PRIVACY_KEYWORDS = [
  "privacy",
  "whoisguard",
  "proxy",
  "protected",
  "redacted",
  "contact",
  "conceal",
  "mask",
  "hidden",
  "private",
  "not disclosed",
  "data protected",
];

// --- Helpers ---

/**
 * Safely format a date string (or first element of a string array) to YYYY-MM-DD.
 * WHOIS records sometimes return arrays for date fields.
 */
export function formatDate(dateStr?: string | string[] | null): string | null {
  const raw = Array.isArray(dateStr) ? dateStr[0] : dateStr;
  if (!raw) return null;
  try {
    const date = new Date(raw);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

export function checkPrivacy(str?: string | null): boolean {
  if (!str) return false;
  const lower = str.toLowerCase();
  return PRIVACY_KEYWORDS.some((kw) => lower.includes(kw));
}

export function checkWhoisAvailability(data: Record<string, unknown>): boolean {
  for (const serverKey in data) {
    const record = data[serverKey] as Record<string, unknown>;
    const text = JSON.stringify(record["text"] ?? []).toLowerCase();
    const error = String(record["error"] ?? "").toLowerCase();
    if (NOT_FOUND_KEYWORDS.some((kw) => text.includes(kw) || error.includes(kw))) {
      return true;
    }
  }
  return false;
}

// --- Main function ---

export async function fetchDomainDates(domainName: string): Promise<DomainDates | null> {
  try {
    console.log(`[WHOIS] Fetching data for ${domainName}...`);

    const tld = domainName.split(".").pop()?.toLowerCase();
    const options = tld && TLD_SERVERS[tld] ? { host: TLD_SERVERS[tld] } : undefined;

    let data: Record<string, Record<string, unknown>> = {};
    try {
      data = (await whoiser.whoisDomain(domainName, options)) as Record<string, Record<string, unknown>>;
    } catch (whoisErr) {
      console.warn(`[WHOIS] whoiser failed for ${domainName}, will try RDAP...`, whoisErr);
    }

    let registrationDate: string | null = null;
    let expirationDate: string | null = null;
    let lastUpdateDate: string | null = null;
    let registrantName: string | null = null;
    let registrar: string | null = null;
    let isAvailable = false;
    const nameservers: Set<string> = new Set();
    let registrarWhoisServer: string | null = null;
    let rawText = "";

    // --- Parse WHOIS records ---
    for (const serverKey in data) {
      const record = data[serverKey];

      if (record["text"] && Array.isArray(record["text"])) {
        rawText += `--- WHOIS from ${serverKey} ---\n`;
        rawText += record["text"].join("\n") + "\n\n";
      } else if (record["error"]) {
        rawText += `--- WHOIS Error from ${serverKey} ---\n`;
        rawText += record["error"] + "\n\n";
      }

      if (record["Registrar WHOIS Server"] && typeof record["Registrar WHOIS Server"] === "string") {
        registrarWhoisServer = record["Registrar WHOIS Server"];
      }

      const getValue = (keys: string[]): string | string[] | null => {
        for (const key of keys) {
          if (record[key]) return record[key] as string | string[];
        }
        return null;
      };

      const exp = getValue([
        "Expiry Date",
        "Registry Expiry Date",
        "expiration-date",
        "expires",
        "registrar-registration-expiration-date",
      ]);
      const crt = getValue(["Created Date", "Creation Date", "registration-date", "created"]);
      const upd = getValue(["Updated Date", "Last Updated Date", "updated", "last-update"]);
      const reg = getValue(["Registrar", "registrar", "Sponsoring Registrar"]);
      const registrant = getValue([
        "Registrant Organization",
        "registrant-organization",
        "Registrant Name",
        "registrant-name",
        "Registrant Contact Name",
        "Registrant",
        "registrant",
        "Admin Organization",
        "Admin Name",
      ]);
      const ns = record["Name Server"] || record["nserver"] || record["Name Servers"] || record["name-servers"];

      if (exp && !expirationDate) expirationDate = formatDate(exp as string | string[]);
      if (crt && !registrationDate) registrationDate = formatDate(crt as string | string[]);
      if (upd && !lastUpdateDate) lastUpdateDate = formatDate(upd as string | string[]);
      if (reg && !registrar) registrar = String(reg);
      if (registrant && !registrantName) registrantName = String(registrant);

      if (ns) {
        const nsVal = ns as string | string[];
        if (Array.isArray(nsVal)) {
          nsVal.forEach((n) => nameservers.add(n.toLowerCase()));
        } else if (typeof nsVal === "string") {
          nameservers.add(nsVal.toLowerCase());
        }
      }
    }

    // --- Follow registrar WHOIS server if registrant name still missing ---
    if (registrarWhoisServer && !registrantName) {
      try {
        console.log(`[WHOIS] Following registrar WHOIS server: ${registrarWhoisServer}`);
        const registrarData = (await whoiser.whoisDomain(domainName, {
          host: registrarWhoisServer,
        })) as Record<string, Record<string, unknown>>;

        for (const serverKey in registrarData) {
          const record = registrarData[serverKey];
          const found =
            record["Registrant Name"] ||
            record["Registrant Organization"] ||
            record["registrant-name"] ||
            record["Registrant Contact Name"] ||
            record["Registrant"];

          if (found) {
            registrantName = String(found);
            break;
          }
        }
      } catch (e) {
        console.warn(`[WHOIS] Failed to follow registrar server ${registrarWhoisServer}`, e);
      }
    }

    // --- RDAP fallback if basic data is missing ---
    const missingBasic = !registrationDate || !expirationDate || !registrar;
    const missingExtras = !lastUpdateDate || nameservers.size === 0;

    if (missingBasic || missingExtras) {
      if (missingBasic) console.log(`[WHOIS] Basic data missing for ${domainName}, trying RDAP...`);

      const rdapData = await fetchRDAP(domainName);
      if (rdapData) {
        if (!registrationDate && rdapData.registrationDate) registrationDate = rdapData.registrationDate;
        if (!expirationDate && rdapData.expirationDate) expirationDate = rdapData.expirationDate;
        if (!registrar && rdapData.registrar) registrar = rdapData.registrar;
        if (!registrantName && rdapData.registrantName) registrantName = rdapData.registrantName;
        if (!lastUpdateDate && rdapData.lastUpdateDate) lastUpdateDate = rdapData.lastUpdateDate;
        // Only trust the RDAP availability signal when WHOIS produced no
        // registration evidence at all; a 404 from a wrong fallback server
        // (e.g. Identity Digital for a TLD it doesn't manage) must not
        // override data already extracted from WHOIS.
        if (rdapData.isAvailable && !registrationDate && !expirationDate) isAvailable = true;
        rdapData.nameservers?.forEach((n) => nameservers.add(n.toLowerCase()));
      }
    }

    // --- Availability check from WHOIS text ---
    if (!registrationDate && !expirationDate && !isAvailable) {
      isAvailable = checkWhoisAvailability(data as Record<string, unknown>);
    }

    // --- Privacy detection ---
    const isPrivate =
      (!registrantName && !!registrationDate) || checkPrivacy(registrar) || checkPrivacy(registrantName);

    return {
      registrationDate,
      expirationDate,
      lastUpdateDate,
      registrar,
      registrantName,
      isPrivate,
      isAvailable,
      nameservers: Array.from(nameservers),
      rawText: rawText.trim() || undefined,
    };
  } catch (error) {
    console.error(`[WHOIS] Failed to fetch domain dates for ${domainName}:`, error);
    return null;
  }
}
