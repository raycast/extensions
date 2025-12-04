import { readFileSync } from "fs";
import { createHash } from "crypto";

export function getFileSha256(filePath: string): string | null {
  try {
    return createHash("sha256").update(readFileSync(filePath)).digest("hex");
  } catch (error) {
    return null;
  }
}
