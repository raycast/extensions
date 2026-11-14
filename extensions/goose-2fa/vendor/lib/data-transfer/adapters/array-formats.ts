import type { NewAccountInput } from "../../types";
import { normalizeAlgorithm, normalizeType } from "../normalization";

/** andOTP backup: plain JSON array with { secret, issuer, label, type, algorithm, digits, period } */
export function tryAndOTP(arr: unknown[]): NewAccountInput[] | null {
  if (arr.length === 0) return null;
  const first = arr[0] as Record<string, unknown>;
  // andOTP entries have "secret" and usually "type" fields
  if (!("secret" in first)) return null;

  const results: NewAccountInput[] = [];
  for (const entry of arr as Record<string, unknown>[]) {
    const secret = entry.secret as string | undefined;
    if (!secret) continue;

    let name = ((entry.label ?? entry.name ?? entry.account ?? "") as string);
    let issuer = ((entry.issuer ?? entry.issuerExt ?? "") as string);

    // andOTP uses "Issuer:Account" format in label
    if (!issuer && name.includes(":")) {
      const idx = name.indexOf(":");
      issuer = name.slice(0, idx).trim();
      name = name.slice(idx + 1).trim();
    }

    results.push({
      name: name || issuer || "Unknown",
      issuer,
      secret: String(secret).replace(/\s/g, "").toUpperCase(),
      type: normalizeType((entry.type ?? "TOTP") as string),
      digits: parseInt(String(entry.digits ?? 6)) || 6,
      period: parseInt(String(entry.period ?? entry.timer ?? 30)) || 30,
      counter: parseInt(String(entry.counter ?? 0)) || 0,
      algorithm: normalizeAlgorithm((entry.algorithm ?? entry.algo ?? "SHA1") as string),
    });
  }
  return results.length > 0 ? results : null;
}

/** Raivo OTP backup: JSON array with { issuer, account, secret, algorithm, digits, kind, timer, counter } */
export function tryRaivo(arr: unknown[]): NewAccountInput[] | null {
  if (arr.length === 0) return null;
  const first = arr[0] as Record<string, unknown>;
  if (!("secret" in first) || !("kind" in first || "timer" in first)) return null;

  const results: NewAccountInput[] = [];
  for (const entry of arr as Record<string, unknown>[]) {
    const secret = entry.secret as string | undefined;
    if (!secret) continue;

    results.push({
      name: ((entry.account ?? entry.name ?? entry.label ?? "") as string) || (entry.issuer as string) || "Unknown",
      issuer: (entry.issuer as string) || "",
      secret: String(secret).replace(/\s/g, "").toUpperCase(),
      type: normalizeType((entry.kind ?? entry.type ?? "TOTP") as string),
      digits: parseInt(String(entry.digits ?? 6)) || 6,
      period: parseInt(String(entry.timer ?? entry.period ?? 30)) || 30,
      counter: parseInt(String(entry.counter ?? 0)) || 0,
      algorithm: normalizeAlgorithm((entry.algorithm ?? "SHA1") as string),
    });
  }
  return results.length > 0 ? results : null;
}

/**
 * FreeOTP+ backup: JSON array with { issuerExt, label, secret (byte array or base32), algo, digits, period, type }
 * FreeOTP+ may encode secret as a JSON number array instead of base32 string.
 */
export function tryFreeOTP(arr: unknown[]): NewAccountInput[] | null {
  if (arr.length === 0) return null;
  const first = arr[0] as Record<string, unknown>;
  if (!("secret" in first) || !("issuerExt" in first || "issuerInt" in first)) return null;

  const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  function numArrayToBase32(nums: number[]): string {
    let result = "";
    let bits = 0;
    let value = 0;
    for (const byte of nums) {
      value = (value << 8) | (byte & 0xff);
      bits += 8;
      while (bits >= 5) {
        bits -= 5;
        result += B32[(value >> bits) & 31];
      }
    }
    if (bits > 0) result += B32[(value << (5 - bits)) & 31];
    return result;
  }

  const results: NewAccountInput[] = [];
  for (const entry of arr as Record<string, unknown>[]) {
    let secret = "";
    if (Array.isArray(entry.secret)) {
      secret = numArrayToBase32(entry.secret as number[]);
    } else if (typeof entry.secret === "string") {
      secret = (entry.secret as string).replace(/\s/g, "").toUpperCase();
    }
    if (!secret) continue;

    results.push({
      name: ((entry.label ?? entry.name ?? "") as string) || ((entry.issuerExt ?? entry.issuerInt ?? "") as string) || "Unknown",
      issuer: ((entry.issuerExt ?? entry.issuerInt ?? entry.issuer ?? "") as string),
      secret,
      type: normalizeType((entry.type ?? "TOTP") as string),
      digits: parseInt(String(entry.digits ?? 6)) || 6,
      period: parseInt(String(entry.period ?? 30)) || 30,
      counter: parseInt(String(entry.counter ?? 0)) || 0,
      algorithm: normalizeAlgorithm((entry.algo ?? entry.algorithm ?? "SHA1") as string),
    });
  }
  return results.length > 0 ? results : null;
}
