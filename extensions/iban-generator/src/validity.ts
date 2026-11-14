import { INVALID_KINDS, type InvalidKind } from "./lib";

export const VALIDITY_VALID = "valid";
export type ValidityChoice = typeof VALIDITY_VALID | InvalidKind;

export function invalidKindTitle(kind: InvalidKind): string {
  return INVALID_KINDS.find((entry) => entry.kind === kind)?.title ?? kind;
}

export function invalidKindDescription(kind: InvalidKind): string {
  return INVALID_KINDS.find((entry) => entry.kind === kind)?.description ?? "";
}

export function validityDropdownInfo(choice: ValidityChoice): string | undefined {
  if (choice === VALIDITY_VALID) {
    return "Produces a structurally valid IBAN with a correct checksum.";
  }
  return invalidKindDescription(choice) || undefined;
}
