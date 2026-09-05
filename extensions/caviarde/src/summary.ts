import type { EntityType, SemanticSkipReason } from "./detection/types";

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

/** Phrased as what went unchecked rather than what failed: a user with no
 * detector sees this on every paste, and a fault reads as a broken install. */
const SKIP_NOTE: Readonly<Record<SemanticSkipReason, string>> = {
  unreachable: "names and places not checked",
  timeout: "detector too slow, names not checked",
  "too-large": "text too long, names not checked",
  disabled: "name detection off",
  failed: "detector error, names not checked",
};

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

export function buildSummary(
  counts: ReadonlyMap<EntityType, number>,
  skipped?: SemanticSkipReason,
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

  const note = skipped === undefined ? "" : ` (partial: ${SKIP_NOTE[skipped]})`;
  if (total === 0) return `Nothing to mask${note}`;

  return `${total} masked: ${parts.join(", ")}${note}`;
}
