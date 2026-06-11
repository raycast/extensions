import type { InputType } from "./explorer-types";

const HEX_REGEX = /^0x[0-9a-fA-F]+$/;
const BLOCK_REGEX = /^[0-9]+$/;

export function detectInputType(input: string): InputType | null {
  if (input.startsWith("0x")) {
    if (input.length === 42 && HEX_REGEX.test(input)) return "address";
    if (input.length === 66 && HEX_REGEX.test(input)) return "tx";
    return null;
  }

  if (BLOCK_REGEX.test(input)) return "block";

  return null;
}
