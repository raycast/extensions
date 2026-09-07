import * as crypto from "node:crypto";

/**
 * Base32 decode helper for TOTP secrets
 */
function base32Decode(base32: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = base32.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const val = alphabet.indexOf(cleaned[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export interface TotpResult {
  token: string;
  secondsRemaining: number;
  period: number;
}

/**
 * Generate instantaneous TOTP code with time remaining
 */
export function generateLocalTotp(secretBase32: string, period = 30, digits = 6): TotpResult | null {
  try {
    if (!secretBase32 || secretBase32.trim().length === 0) return null;
    const key = base32Decode(secretBase32);
    if (key.length === 0) return null;

    const epoch = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epoch / period);
    const secondsRemaining = period - (epoch % period);

    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(counter), 0);

    const hmac = crypto.createHmac("sha1", key);
    hmac.update(buf);
    const digest = hmac.digest();

    const offset = digest[digest.length - 1] & 0x0f;
    const code =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);

    const strCode = (code % Math.pow(10, digits)).toString().padStart(digits, "0");
    return { token: strCode, secondsRemaining, period };
  } catch {
    return null;
  }
}

export interface PasswordStrength {
  score: number; // 0 to 4
  label: "Very Weak" | "Weak" | "Moderate" | "Strong" | "Very Strong";
  entropyBits: number;
  color: string;
}

/**
 * Calculate password strength and entropy
 */
export function evaluatePasswordStrength(password?: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: "Very Weak", entropyBits: 0, color: "#ef4444" };
  }

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 32;

  const length = password.length;
  const entropy = Math.round(length * Math.log2(Math.max(poolSize, 2)));

  if (entropy >= 80 && length >= 14) {
    return { score: 4, label: "Very Strong", entropyBits: entropy, color: "#10b981" };
  } else if (entropy >= 60 && length >= 10) {
    return { score: 3, label: "Strong", entropyBits: entropy, color: "#3b82f6" };
  } else if (entropy >= 40 && length >= 8) {
    return { score: 2, label: "Moderate", entropyBits: entropy, color: "#f59e0b" };
  } else if (entropy >= 20) {
    return { score: 1, label: "Weak", entropyBits: entropy, color: "#f97316" };
  } else {
    return { score: 0, label: "Very Weak", entropyBits: entropy, color: "#ef4444" };
  }
}
