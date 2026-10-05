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

/** SRP password-hashing variants Apple can select at signin/init. */
export type SrpProtocol = "s2k" | "s2k_fo";

export function hashPassword(
  password: string,
  salt: crypto.BinaryLike,
  iterations: number,
  protocol: SrpProtocol = "s2k",
  key_length: number = 32,
) {
  const passwordHash = crypto.createHash("sha256").update(password, "utf8").digest();

  // s2k feeds PBKDF2 the 32 raw digest bytes; s2k_fo feeds it the digest's hex text
  // (64 ASCII characters) instead. The two produce completely different keys, and the
  // wrong one makes Apple reject the SRP proof at signin/complete.
  let passwordDigest: Buffer;
  if (protocol === "s2k") {
    passwordDigest = passwordHash;
  } else if (protocol === "s2k_fo") {
    passwordDigest = Buffer.from(passwordHash.toString("hex"), "utf8");
  } else {
    throw new Error(`Unsupported SRP protocol: ${protocol}`);
  }

  const hashBuffer = crypto.pbkdf2Sync(passwordDigest, salt, iterations, key_length, "sha256");
  return hashBuffer;
}
