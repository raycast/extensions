import { createHash } from "node:crypto";

export function resolveApiKey(
  prefKey: string | null | undefined,
): string | null {
  const key = prefKey?.trim();
  return key && key.length > 0 ? key : null;
}

export function keyFingerprint(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}
