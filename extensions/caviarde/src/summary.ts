import type { EntityType } from "./detection/types";

const NOUNS: Readonly<Record<EntityType, readonly [string, string]>> = {
  PERSON: ["name", "names"],
  LOCATION: ["location", "locations"],
  ORGANIZATION: ["organisation", "organisations"],
  EMAIL: ["email", "emails"],
  PHONE: ["phone number", "phone numbers"],
  IP: ["IP address", "IP addresses"],
  IBAN: ["IBAN", "IBANs"],
  CARD: ["card", "cards"],
  SIREN: ["SIREN", "SIRENs"],
  SIRET: ["SIRET", "SIRETs"],
  VAT: ["VAT number", "VAT numbers"],
  API_KEY: ["API key", "API keys"],
  JWT: ["JWT", "JWTs"],
  PRIVATE_KEY: ["private key", "private keys"],
};

/** One note for every reason, because the user acts on the same thing in all of
 * them: those three kinds were not looked for. Naming the cause instead would
 * read as a fault on every paste made without a detector. */
const NOT_CHECKED = "Names, locations and organisations not checked";

/** Ordered so the HUD reads consistently rather than by map insertion. */
const ORDER: readonly EntityType[] = [
  "PERSON",
  "LOCATION",
  "ORGANIZATION",
  "EMAIL",
  "PHONE",
  "IBAN",
  "CARD",
  "SIREN",
  "SIRET",
  "VAT",
  "IP",
  "API_KEY",
  "JWT",
  "PRIVATE_KEY",
];

/** A HUD cannot be given a duration, so a long line simply flashes past. Past
 * this, the total alone is what a reader can actually take in. */
const MAX_CATEGORIES = 3;

export function buildSummary(
  counts: ReadonlyMap<EntityType, number>,
  skipped?: boolean,
): string {
  const parts: string[] = [];
  let total = 0;

  for (const type of ORDER) {
    const count = counts.get(type) ?? 0;
    if (count === 0) continue;
    total += count;
    const [singular, plural] = NOUNS[type];
    parts.push(`${count} ${count === 1 ? singular : plural}`);
  }

  if (total === 0) {
    return skipped === true
      ? `Pasted unchanged. ${NOT_CHECKED}`
      : "Pasted. Nothing detected";
  }

  const values = `${total} ${total === 1 ? "value" : "values"} masked`;
  if (skipped === true) return `Pasted. ${values}. ${NOT_CHECKED}`;

  return parts.length <= MAX_CATEGORIES
    ? `Pasted. ${parts.join(", ")} masked`
    : `Pasted. ${values}`;
}
