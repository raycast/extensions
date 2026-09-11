import { domainToASCII } from "node:url";

export const DEFAULT_TLDS = ["com", "net", "org", "io", "dev", "app", "ai", "co"];
export const MAX_CANDIDATES = 50;

/** One DNS label: 1–63 characters, letters/digits/hyphens, no leading or trailing hyphen. */
const LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD_PATTERN = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

/**
 * Turns whatever the user typed into a lowercase hostname candidate:
 * strips scheme, path, query, port and surrounding dots, and converts IDNs to punycode.
 */
export function normalizeInput(raw: string): string {
  let value = raw.trim().toLowerCase();
  if (!value) return "";
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  value = value.split(/[/?#]/, 1)[0] ?? "";
  value = value.replace(/^.*@/, "");
  value = value.replace(/:\d+$/, "");
  value = value.replace(/\s+/g, "");
  value = value.replace(/^\.+|\.+$/g, "");
  if (/[^\x20-\x7e]/.test(value)) {
    const ascii = domainToASCII(value);
    if (ascii) value = ascii;
  }
  return value;
}

export function isValidDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false;
  const labels = domain.split(".");
  if (labels.length < 2) return false;
  if (!labels.every((label) => LABEL_PATTERN.test(label))) return false;
  return TLD_PATTERN.test(labels[labels.length - 1]);
}

export const isValidKeyword = (keyword: string): boolean => LABEL_PATTERN.test(keyword);

/** Parses the "Default TLDs" preference. Falls back to DEFAULT_TLDS when nothing usable is configured. */
export function parseTldList(value: string | undefined | null): string[] {
  if (!value) return [...DEFAULT_TLDS];
  const seen = new Set<string>();
  for (const part of value.split(/[\s,;]+/)) {
    const tld = part.trim().toLowerCase().replace(/^\.+/, "");
    if (tld && /^[a-z0-9.-]+$/.test(tld)) seen.add(tld);
  }
  return seen.size > 0 ? [...seen] : [...DEFAULT_TLDS];
}

export type CandidateMode = "empty" | "keyword" | "domain" | "invalid";

export interface Candidates {
  mode: CandidateMode;
  /** The normalized query. */
  query: string;
  candidates: string[];
}

/**
 * A bare keyword ("acme") expands to keyword.tld for each default TLD.
 * Anything with a dot is treated as a full domain and checked as-is.
 */
export function buildCandidates(raw: string, defaultTlds: string[] = DEFAULT_TLDS, max = MAX_CANDIDATES): Candidates {
  const query = normalizeInput(raw);
  if (!query) return { mode: "empty", query, candidates: [] };
  if (query.includes(".")) {
    return isValidDomain(query)
      ? { mode: "domain", query, candidates: [query] }
      : { mode: "invalid", query, candidates: [] };
  }
  if (!isValidKeyword(query)) return { mode: "invalid", query, candidates: [] };
  const tlds = defaultTlds.length > 0 ? defaultTlds : DEFAULT_TLDS;
  const candidates = tlds
    .map((tld) => `${query}.${tld}`)
    .filter(isValidDomain)
    .slice(0, max);
  return { mode: "keyword", query, candidates };
}

/**
 * Splits a domain into second-level part and TLD. When `knownTlds` is given (e.g. the keys of the pricing table),
 * the longest matching multi-label suffix wins, so "shop.co.uk" → { sld: "shop", tld: "co.uk" }.
 */
export function splitDomain(domain: string, knownTlds?: Iterable<string>): { sld: string; tld: string } {
  const labels = domain.trim().toLowerCase().split(".");
  if (knownTlds) {
    const known = new Set(Array.from(knownTlds, (tld) => tld.toLowerCase().replace(/^\.+/, "")));
    for (let index = 1; index < labels.length; index++) {
      const suffix = labels.slice(index).join(".");
      if (known.has(suffix)) return { sld: labels.slice(0, index).join("."), tld: suffix };
    }
  }
  return { sld: labels.slice(0, -1).join("."), tld: labels[labels.length - 1] ?? "" };
}
