import { BBAN_LAYOUTS, digitRequiredPositions, upperRequiredPositions } from "./bban-spec";
import { computeIbanCheckDigits, expandIbanChars, mod9710 } from "./checksum";
import { generateIban } from "./generate";
import type { GenerateOptions, GeneratedIban, InvalidKind } from "./types";
import { formatIban } from "./validate";

export { INVALID_KINDS } from "./invalid-kinds";

function ibanCheckDigitsMatch(countryCode: string, checkDigits: string, bban: string): boolean {
  const validationString = expandIbanChars(`${bban}${countryCode}00`);
  const remainder = mod9710(validationString);
  return 98 - remainder === parseInt(checkDigits, 10);
}

function pickWrongCheckDigits(countryCode: string, correct: string, bban: string): string {
  const correctNum = parseInt(correct, 10);
  for (let offset = 1; offset < 97; offset++) {
    const candidateNum = (correctNum + offset) % 97;
    const candidate = candidateNum.toString().padStart(2, "0");
    if (!ibanCheckDigitsMatch(countryCode, candidate, bban)) {
      return candidate;
    }
  }
  return correct === "00" ? "01" : "00";
}

/** Replace a required digit in the BBAN while keeping mod-97 check digits valid for the country. */
function mutateBbanStructure(countryCode: string, bban: string): string {
  const layout = BBAN_LAYOUTS[countryCode];
  if (!layout) {
    throw new Error(`Unsupported country: ${countryCode}`);
  }
  const chars = bban.split("");
  const candidates: { pos: number; replacement: string }[] = [];
  for (const pos of digitRequiredPositions(layout)) {
    if (/^[0-9]$/.test(chars[pos]!)) {
      candidates.push({ pos, replacement: "A" });
    }
  }
  for (const pos of upperRequiredPositions(layout)) {
    if (/^[A-Z]$/.test(chars[pos]!)) {
      candidates.push({ pos, replacement: "0" });
    }
  }
  for (const { pos, replacement } of candidates) {
    const corrupted = [...chars];
    corrupted[pos] = replacement;
    const next = corrupted.join("");
    if (!layout.bbanRegexp.test(next)) {
      return next;
    }
  }
  throw new Error(`Cannot corrupt BBAN structure for ${countryCode}`);
}

export function generateInvalidIban(options: GenerateOptions, kind: InvalidKind): GeneratedIban {
  const valid = generateIban(options);

  let brokenIban: string;
  let brokenCountryCode = valid.countryCode;
  let brokenCheckDigits = valid.checkDigits;
  let brokenBban = valid.bban;

  switch (kind) {
    case "checksum": {
      const wrong = pickWrongCheckDigits(valid.countryCode, valid.checkDigits, valid.bban);
      brokenCheckDigits = wrong;
      brokenIban = `${valid.countryCode}${wrong}${valid.bban}`;
      break;
    }
    case "too-short": {
      brokenIban = valid.iban.slice(0, -1);
      brokenCheckDigits = brokenIban.slice(2, 4);
      brokenBban = brokenIban.slice(4);
      break;
    }
    case "too-long": {
      brokenIban = `${valid.iban}0`;
      brokenCheckDigits = brokenIban.slice(2, 4);
      brokenBban = brokenIban.slice(4);
      break;
    }
    case "unknown-country": {
      brokenCountryCode = "XX";
      brokenCheckDigits = computeIbanCheckDigits("XX", valid.bban);
      brokenIban = `XX${brokenCheckDigits}${valid.bban}`;
      break;
    }
    case "structure": {
      brokenBban = mutateBbanStructure(valid.countryCode, valid.bban);
      brokenCheckDigits = computeIbanCheckDigits(valid.countryCode, brokenBban);
      brokenIban = `${valid.countryCode}${brokenCheckDigits}${brokenBban}`;
      break;
    }
    default:
      throw new Error(`Unknown invalid kind: ${String(kind)}`);
  }

  return {
    ...valid,
    iban: brokenIban,
    formatted: formatIban(brokenIban),
    countryCode: brokenCountryCode,
    checkDigits: brokenCheckDigits,
    bban: brokenBban,
    invalidKind: kind,
  };
}
