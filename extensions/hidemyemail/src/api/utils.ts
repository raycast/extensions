import crypto from "crypto";

export function getNestedHeader(obj: Record<string, unknown>, key: string): string | undefined {
  if (key in obj) {
    const value = obj[key];
    if (typeof value === "string") return value;
    return undefined;
  }

  for (const k in obj) {
    if (typeof obj[k] === "object" && obj[k] !== null) {
      const result = getNestedHeader(obj[k] as Record<string, unknown>, key);
      if (result !== undefined) {
        return result;
      }
    }
  }

  return undefined;
}

export function hashPassword(password: string, salt: crypto.BinaryLike, iterations: number, key_length: number = 32) {
  const passwordHash = crypto.createHash("sha256").update(password, "utf8").digest();
  const hashBuffer = crypto.pbkdf2Sync(passwordHash, salt, iterations, key_length, "sha256");
  return hashBuffer;
}
