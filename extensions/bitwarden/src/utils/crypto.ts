import { readFileSync } from "fs";
import { createHash } from "crypto";

export async function getFileSha256(filePath: string): Promise<string | null> {
  try {
    const buff = readFileSync(filePath);
    const hash = createHash("sha256").update(buff).digest("hex");
    return hash;
  } catch (error) {
    return null;
  }
}
