import type { InvalidKind } from "./types";

export const INVALID_KINDS: { kind: InvalidKind; title: string; description: string }[] = [
  {
    kind: "checksum",
    title: "Wrong IBAN Check Digits",
    description: "Valid national structure; only the two ISO mod-97 check digits are wrong.",
  },
  {
    kind: "too-short",
    title: "Too Short",
    description: "A valid IBAN with one character removed from the end.",
  },
  {
    kind: "too-long",
    title: "Too Long",
    description: "A valid IBAN with one extra digit appended at the end.",
  },
  {
    kind: "unknown-country",
    title: "Unknown Country Code",
    description: "Country code is not in the IBAN registry; mod-97 check digits match the string.",
  },
  {
    kind: "structure",
    title: "Invalid BBAN Structure",
    description: "A letter where a digit is required; mod-97 check digits match the mutated string.",
  },
];
