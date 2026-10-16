import { TOTP, URI } from "otpauth";
import { getDomain } from "tldts";
import type { Resource, ResourceType, TotpConfiguration, TotpResource } from "../types";

function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

// Unknown/custom schemas are checked rather than silently omitting possible TOTP entries.
export function resourceTypeSupportsTotp(type?: ResourceType): boolean | undefined {
  if (!type) return undefined;
  if (/(^|-)totp($|-)/i.test(type.slug)) return true;
  let definition = type.definition;
  if (typeof definition === "string") {
    try {
      definition = JSON.parse(definition);
    } catch {
      return undefined;
    }
  }
  const secret = object(object(definition)?.secret);
  const properties = object(secret?.properties);
  if (properties) return Object.hasOwn(properties, "totp");
  if (secret?.type === "string") return false;
  if (
    /^(password|password-string|password-and-description|v5-default|v5-password-string|v5-note|v5-pin-code)$/.test(
      type.slug,
    )
  ) {
    return false;
  }
  return undefined;
}

export function parseTotpConfiguration(decrypted: string): TotpConfiguration | undefined {
  let data: unknown;
  try {
    data = JSON.parse(decrypted);
  } catch {
    return undefined;
  }
  const value = object(data)?.totp;
  if (value == null) return undefined;
  const raw = object(value);
  const secret = typeof value === "string" ? value : raw?.secret_key;
  if (typeof secret !== "string" || !secret.trim()) throw new Error("TOTP secret is missing");

  if (secret.startsWith("otpauth://")) {
    const generator = URI.parse(secret);
    if (!(generator instanceof TOTP)) throw new Error("This entry uses HOTP, not TOTP");
    return {
      secretKey: generator.secret.base32,
      algorithm: generator.algorithm,
      digits: generator.digits,
      period: generator.period,
      issuer: generator.issuer,
      label: generator.label,
    };
  }

  const algorithm = typeof raw?.algorithm === "string" ? raw.algorithm.replace(/-/g, "").toUpperCase() : "SHA1";
  const digits = raw?.digits ?? 6;
  const period = raw?.period ?? 30;
  if (!["SHA1", "SHA256", "SHA512"].includes(algorithm)) throw new Error("Unsupported TOTP algorithm");
  if (typeof digits !== "number" || !Number.isInteger(digits) || digits < 6 || digits > 8) {
    throw new Error("Invalid TOTP code length");
  }
  if (typeof period !== "number" || !Number.isSafeInteger(period) || period <= 0) {
    throw new Error("Invalid TOTP refresh period");
  }
  const config = { secretKey: secret.replace(/\s+/g, "").toUpperCase(), algorithm, digits, period };
  createTotpGenerator(config); // Validate the base32 secret before exposing a copy action.
  return config;
}

export function createTotpGenerator(config: TotpConfiguration): TOTP {
  return new TOTP({
    secret: config.secretKey,
    algorithm: config.algorithm,
    digits: config.digits,
    period: config.period,
  });
}

export function filterTotpResources(resources: TotpResource[], query: string): TotpResource[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return resources;
  return resources.filter((resource) => {
    const values = [
      resource.name,
      resource.username,
      resource.uri,
      ...(resource.uris ?? []),
      resource.description,
      ...(resource.tags ?? []).map((tag) => tag.slug),
      resource.totp?.issuer,
      resource.totp?.label,
    ].filter((value): value is string => typeof value === "string");
    const text = values.join(" ").toLowerCase();
    const initials = (resource.name?.match(/[\p{L}\p{N}]+/gu) ?? [])
      .map((word) => word[0])
      .join("")
      .toLowerCase();
    const aliases = /\boracle\b|oraclecloud\.com/.test(text) ? "oci oracle cloud infrastructure" : "";
    return terms.every((term) => text.includes(term) || initials.includes(term) || aliases.includes(term));
  });
}

export function websiteHostname(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) && !/^[^/:]+:\d+(?:\/|$)/.test(value);
    const url = new URL(hasScheme ? value : `https://${value}`);
    return ["https:", "http:"].includes(url.protocol) ? url.hostname.toLowerCase().replace(/\.$/, "") : undefined;
  } catch {
    return undefined;
  }
}

export function websiteMatchScore(resource: Resource, currentUrl?: string): number {
  const currentHost = websiteHostname(currentUrl);
  if (!currentHost) return 0;
  const currentDomain = getDomain(currentHost, { allowPrivateDomains: true });
  let score = 0;
  for (const uri of [resource.uri, ...(resource.uris ?? [])]) {
    const host = websiteHostname(uri);
    if (!host) continue;
    if (host === currentHost) return 2;
    if (currentDomain && getDomain(host, { allowPrivateDomains: true }) === currentDomain) score = 1;
  }
  return score;
}

export function rankTotpResources(resources: TotpResource[], currentUrl?: string): TotpResource[] {
  return resources
    .map((resource) => ({ resource, score: websiteMatchScore(resource, currentUrl) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(Boolean(b.resource.favorite)) - Number(Boolean(a.resource.favorite)) ||
        (a.resource.name ?? "").localeCompare(b.resource.name ?? ""),
    )
    .map(({ resource }) => resource);
}
