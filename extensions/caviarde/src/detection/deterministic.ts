import type { EntityType, Span } from "./types";
import { isSirenValid, isSiretValid } from "./validators/french-business";
import { isIbanValid } from "./validators/iban";
import { isMaskableIpv4, isMaskableIpv6 } from "./validators/ip";
import { isLuhnValid } from "./validators/luhn";

const PEM_BLOCK =
  /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----[\s\S]{1,20000}?-----END (?:[A-Z0-9]+ )*PRIVATE KEY-----/g;

const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;

const API_KEY = new RegExp(
  [
    "\\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}",
    "\\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{16,}",
    "\\bgh[pousr]_[A-Za-z0-9]{36}\\b",
    "\\b(?:AKIA|ASIA|ABIA|ACCA|AGPA|AIDA|AIPA|ANPA|ANVA|APKA|AROA)[0-9A-Z]{16}\\b",
    "\\bxox[abpsr]-[A-Za-z0-9-]{10,}",
    "\\bAIza[0-9A-Za-z_-]{35}\\b",
  ].join("|"),
  "g",
);

const EMAIL =
  /(?<![\p{L}\p{N}._%+-])[\p{L}\p{N}_%+-]+(?:\.[\p{L}\p{N}_%+-]+)*@(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?\.)+\p{L}{2,}(?![\p{L}\p{N}-])/gu;

/** An "@" before a capitalised word marks a person in a Notion or Slack thread.
 * The certainty is in the "@", not the word, so no model is involved. */
const MENTION =
  /(?<=@)\p{Lu}[\p{L}'’-]*(?:[ ](?:(?:de|du|des|van|von|da|di|del|dos|el|le|la)[ ])?\p{Lu}[\p{L}'’-]*){0,2}/gu;

const IPV6_CANDIDATE =
  /(?<![\w:.])[0-9A-Fa-f]{0,4}(?::[0-9A-Fa-f]{0,4}){2,7}(?![\w:.])/g;
const IPV4 = /(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?!\d)(?!\.\d)/g;

const IBAN_CANDIDATE =
  /(?<![A-Za-z0-9])[A-Za-z]{2}\d{2}(?:[ ]?[A-Za-z0-9]){11,30}(?![A-Za-z0-9])/g;

const SIRET_CANDIDATE = /(?<!\d)\d{3}[ ]?\d{3}[ ]?\d{3}[ ]?\d{5}(?!\d)/g;
const SIREN_CANDIDATE = /(?<!\d)\d{3}[ ]?\d{3}[ ]?\d{3}(?!\d)/g;
/** A random 9-digit number passes Luhn one time in ten, and documents are full of them. */
const SIREN_CONTEXT =
  /(?:siren|siret|rcs|immatricul|greffe)[^\p{L}\p{N}]{0,12}$/iu;
const SIREN_CONTEXT_WINDOW = 32;

const CARD_CANDIDATE = /(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g;

const PHONE_INTERNATIONAL = /(?<![\d+])\+\d{1,3}(?:[ .-]?\d){6,14}(?!\d)/g;
const PHONE_FRENCH = /(?<![\d+])0[1-9](?:[ .-]?\d{2}){4}(?!\d)/g;

function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}

type Finder = (text: string) => Span[];

function simple(
  type: EntityType,
  pattern: RegExp,
  accept?: (match: string) => boolean,
): Finder {
  return (text) => {
    const found: Span[] = [];
    for (const match of text.matchAll(pattern)) {
      if (match.index === undefined) continue;
      if (accept && !accept(match[0])) continue;
      found.push({
        type,
        start: match.index,
        end: match.index + match[0].length,
        layer: "deterministic",
      });
    }
    return found;
  };
}

/** The candidate can run past the IBAN into prose, so trailing tokens are trimmed
 * off until what remains validates. */
const findIban: Finder = (text) => {
  const found: Span[] = [];
  for (const match of text.matchAll(IBAN_CANDIDATE)) {
    if (match.index === undefined) continue;
    const tokens = match[0].split(" ");
    while (tokens.length > 0) {
      const candidate = tokens.join(" ");
      if (isIbanValid(candidate)) {
        found.push({
          type: "IBAN",
          start: match.index,
          end: match.index + candidate.length,
          layer: "deterministic",
        });
        break;
      }
      tokens.pop();
    }
  }
  return found;
};

const findSiren: Finder = (text) => {
  const found: Span[] = [];
  for (const match of text.matchAll(SIREN_CANDIDATE)) {
    if (match.index === undefined) continue;
    if (!isSirenValid(digitsOf(match[0]))) continue;

    const before = text.slice(
      Math.max(0, match.index - SIREN_CONTEXT_WINDOW),
      match.index,
    );
    const spaced = match[0].includes(" ");
    if (!spaced && !SIREN_CONTEXT.test(before)) continue;

    found.push({
      type: "SIREN",
      start: match.index,
      end: match.index + match[0].length,
      layer: "deterministic",
    });
  }
  return found;
};

/** Priority order. A later finder never claims a range an earlier one took, so a
 * 14-digit SIRET is not also reported as a card. */
const FINDERS: readonly Finder[] = [
  simple("PRIVATE_KEY", PEM_BLOCK),
  simple("JWT", JWT),
  simple("API_KEY", API_KEY),
  simple("EMAIL", EMAIL),
  simple("PERSON", MENTION),
  simple("IP", IPV6_CANDIDATE, isMaskableIpv6),
  simple("IP", IPV4, isMaskableIpv4),
  findIban,
  simple("SIRET", SIRET_CANDIDATE, (m) => isSiretValid(digitsOf(m))),
  findSiren,
  simple("CARD", CARD_CANDIDATE, (m) => {
    const digits = digitsOf(m);
    return digits.length >= 13 && digits.length <= 19 && isLuhnValid(digits);
  }),
  simple("PHONE", PHONE_INTERNATIONAL),
  simple("PHONE", PHONE_FRENCH),
];

export function detectDeterministic(text: string): Span[] {
  if (text.length === 0) return [];

  const accepted: Span[] = [];
  for (const find of FINDERS) {
    for (const span of find(text)) {
      const clashes = accepted.some(
        (kept) => span.start < kept.end && kept.start < span.end,
      );
      if (!clashes) accepted.push(span);
    }
  }

  return accepted.sort((a, b) => a.start - b.start || a.end - b.end);
}
