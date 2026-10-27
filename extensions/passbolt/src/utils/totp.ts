import { TOTP, URI } from "otpauth";
import { websiteMatchContext, websiteRelevanceScore } from "./website";
export { websiteHostname, websiteMatchScore } from "./website";
import type { ResourceType, TotpConfiguration, TotpResource } from "../types";

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

// One precomputed search blob per entry, rebuilt only when the items array identity changes.
// Query terms are whitespace-free, so matching the joined text equals matching per field.
interface TotpSearchBlob {
  text: string;
  initials: string;
  aliases: string;
}

const totpBlobCache = new WeakMap<TotpResource[], TotpSearchBlob[]>();

function totpSearchBlobs(resources: TotpResource[]): TotpSearchBlob[] {
  let blobs = totpBlobCache.get(resources);
  if (!blobs) {
    blobs = resources.map((resource) => {
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
      return { text, initials, aliases };
    });
    totpBlobCache.set(resources, blobs);
  }
  return blobs;
}

export function filterTotpResources(resources: TotpResource[], query: string): TotpResource[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return resources;
  const blobs = totpSearchBlobs(resources);
  return resources.filter((_resource, index) => {
    const { text, initials, aliases } = blobs[index];
    return terms.every((term) => text.includes(term) || initials.includes(term) || aliases.includes(term));
  });
}

function scoreTotpResources(resources: TotpResource[], currentUrl?: string, title?: string) {
  const context = websiteMatchContext(currentUrl, title);
  return resources
    .map((resource) => ({
      resource,
      score: websiteRelevanceScore(resource, context, [resource.totp?.issuer, resource.totp?.label]),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(Boolean(b.resource.favorite)) - Number(Boolean(a.resource.favorite)) ||
        (a.resource.name ?? "").localeCompare(b.resource.name ?? ""),
    );
}

export function rankTotpResources(resources: TotpResource[], currentUrl?: string, title?: string): TotpResource[] {
  return scoreTotpResources(resources, currentUrl, title).map(({ resource }) => resource);
}

// Scores each entry once and splits the ranked list in a single pass.
export function rankAndPartitionTotpResources(
  resources: TotpResource[],
  currentUrl?: string,
  title?: string,
): { matching: TotpResource[]; others: TotpResource[] } {
  const matching: TotpResource[] = [];
  const others: TotpResource[] = [];
  for (const { resource, score } of scoreTotpResources(resources, currentUrl, title)) {
    (score > 0 ? matching : others).push(resource);
  }
  return { matching, others };
}
