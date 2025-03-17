import { readFileSync } from "fs";
import { createHash } from "crypto";

export function getFileSha256(filePath: string): string | null {
  try {
    const fileBuffer = readFileSync(filePath);
    return createHash("sha256").update(new Uint8Array(fileBuffer)).digest("hex");
  } catch (error) {
    return null;
  }
}
