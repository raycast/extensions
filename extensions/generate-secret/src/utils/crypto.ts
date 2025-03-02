import { randomBytes } from "node:crypto";

export const SECRET_LENGTHS = [16, 32, 64, 128] as const;
export type SecretLength = (typeof SECRET_LENGTHS)[number];

export function generateSecret(length: SecretLength): string {
  if (!SECRET_LENGTHS.includes(length)) {
    throw new Error("Invalid secret length");
  }
  return randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}
