import { randomBytes } from "node:crypto";
import { DomainDepth, hostToLabel } from "./domain";

export interface Account {
  /** What the account is called in the picker. */
  name: string;
  /** True for entries written as `@example.com`. */
  isCatchAll: boolean;
  /** Local part of the address, empty for catch-all accounts. */
  user: string;
  /** Domain part of the address. */
  domain: string;
}

export class AliasError extends Error {}

/**
 * Parses the "Email Accounts" preference.
 *
 * Accepted entries, separated by comma, semicolon or newline:
 *   me@gmail.com                → plus addressing
 *   Work: me@company.com        → plus addressing with a display name
 *   Catch-All: @mydomain.com    → catch-all domain, the alias becomes the local part
 */
export function parseAccounts(preference: string | undefined): Account[] {
  if (!preference) return [];

  return preference
    .split(/[,;\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      let name = "";
      let value = entry;

      const named = entry.match(/^([^:@]+):\s*(.+)$/);
      if (named) {
        name = named[1].trim();
        value = named[2].trim();
      }

      if (value.startsWith("@")) {
        const domain = value.slice(1).trim().toLowerCase();
        return { name: name || `@${domain}`, isCatchAll: true, user: "", domain };
      }

      const at = value.lastIndexOf("@");
      if (at <= 0) {
        return undefined;
      }
      const user = value.slice(0, at).trim();
      const domain = value
        .slice(at + 1)
        .trim()
        .toLowerCase();
      if (!user || !domain) return undefined;
      return { name: name || value.toLowerCase(), isCatchAll: false, user, domain };
    })
    .filter((account): account is Account => account !== undefined);
}

export function formatDate(pattern: string, date = new Date()): string {
  const pad = (value: number, length = 2) => String(value).padStart(length, "0");
  return pattern
    .replace(/yyyy/g, String(date.getFullYear()))
    .replace(/yy/g, pad(date.getFullYear() % 100))
    .replace(/MM/g, pad(date.getMonth() + 1))
    .replace(/dd/g, pad(date.getDate()))
    .replace(/HH/g, pad(date.getHours()))
    .replace(/mm/g, pad(date.getMinutes()));
}

const RANDOM_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function randomToken(length: number): string {
  const size = Math.min(Math.max(Math.trunc(length) || 0, 1), 32);
  const bytes = randomBytes(size);
  let token = "";
  for (let index = 0; index < size; index += 1) {
    token += RANDOM_ALPHABET[bytes[index] % RANDOM_ALPHABET.length];
  }
  return token;
}

export interface SanitizeOptions {
  lowercase: boolean;
  dotReplacement: string;
  maxLength?: number;
}

/** Keeps only characters that are safe in the local part of an address. */
export function sanitizeLabel(value: string, options: SanitizeOptions): string {
  let label = value.trim();
  if (options.lowercase) {
    label = label.toLowerCase();
  }
  label = label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "");

  if (options.dotReplacement) {
    label = label.split(".").join(options.dotReplacement);
    label = label.replace(/-{2,}/g, "-").replace(/^[-._]+|[-._]+$/g, "");
  }

  if (options.maxLength && options.maxLength > 0) {
    label = label.slice(0, options.maxLength).replace(/[-._]+$/g, "");
  }

  return label;
}

export type SuffixMode = "none" | "date" | "random" | "both";

export interface BuildOptions {
  account: Account;
  /** URL, hostname or a hand written label. */
  source: string;
  /** When true, `source` is used verbatim instead of being treated as a host. */
  sourceIsLabel?: boolean;
  depth: DomainDepth;
  stripWww: boolean;
  separator: string;
  suffixMode: SuffixMode;
  suffixSeparator: string;
  dateFormat: string;
  randomLength: number;
  template: string;
  catchAllTemplate: string;
  lowercase: boolean;
  dotReplacement: string;
  maxAliasLength?: number;
  host?: string;
  /** Fixes the random token so a live preview does not change on every keystroke. */
  randomOverride?: string;
}

export interface BuildResult {
  address: string;
  label: string;
  suffix: string;
  host: string;
}

export function buildAlias(options: BuildOptions): BuildResult {
  const sanitize: SanitizeOptions = {
    lowercase: options.lowercase,
    dotReplacement: options.dotReplacement,
    maxLength: options.maxAliasLength,
  };

  const host = options.host ?? (options.sourceIsLabel ? "" : options.source);
  const rawLabel = options.sourceIsLabel
    ? options.source
    : hostToLabel(options.source, { depth: options.depth, stripWww: options.stripWww });

  const label = sanitizeLabel(rawLabel, sanitize);
  if (!label) {
    throw new AliasError("The alias would be empty. Check the domain depth and the replacement characters.");
  }

  const date = options.dateFormat ? formatDate(options.dateFormat) : "";
  const random = options.randomOverride ?? randomToken(options.randomLength);

  const parts: string[] = [];
  if (options.suffixMode === "date" || options.suffixMode === "both") parts.push(date);
  if (options.suffixMode === "random" || options.suffixMode === "both") parts.push(random);
  const suffix = parts.filter(Boolean).join(options.suffixSeparator || "-");

  const alias = suffix ? `${label}${options.suffixSeparator || "-"}${suffix}` : label;

  const template = options.account.isCatchAll ? options.catchAllTemplate : options.template;
  const address = renderTemplate(template, {
    user: options.account.user,
    sep: options.account.isCatchAll ? "" : options.separator,
    label,
    suffix,
    alias,
    domain: options.account.domain,
    host,
    date,
    random,
  });

  if (!address.includes("@")) {
    throw new AliasError("The template did not produce an address. It needs an @ and a {domain} token.");
  }

  return { address, label, suffix, host };
}

export function renderTemplate(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, token: string) =>
    Object.prototype.hasOwnProperty.call(tokens, token) ? tokens[token] : match,
  );
}

export function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseOptionalNumber(value: string | undefined): number | undefined {
  if (!value || !value.trim()) return undefined;
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
