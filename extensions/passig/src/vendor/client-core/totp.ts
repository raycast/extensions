// GENERATO da scripts/vendor.mjs — non modificare: modifica packages/ e rilancia `npm run vendor`.
/**
 * TOTP (RFC 6238) con HMAC via WebCrypto (`globalThis.crypto.subtle`),
 * disponibile sia in Node ≥ 19 (quindi Raycast) sia nel browser/service worker.
 *
 * Accetta sia URI `otpauth://totp/...?secret=...` sia una chiave base32 nuda.
 */

export interface TotpConfig {
  secret: Uint8Array;
  algorithm: "SHA-1" | "SHA-256" | "SHA-512";
  digits: number;
  period: number;
  label?: string;
  issuer?: string;
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/[\s=-]/g, "");
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error("secret base32 non valido");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Uint8Array.from(out);
}

export function parseTotp(input: string): TotpConfig {
  const trimmed = input.trim();
  if (!/^otpauth:/i.test(trimmed)) {
    return { secret: base32Decode(trimmed), algorithm: "SHA-1", digits: 6, period: 30 };
  }
  const url = new URL(trimmed);
  if (url.host.toLowerCase() !== "totp") throw new Error("solo otpauth://totp è supportato");
  const secret = url.searchParams.get("secret");
  if (!secret) throw new Error("secret mancante nell'URI otpauth");
  const algoRaw = (url.searchParams.get("algorithm") ?? "SHA1").toUpperCase().replace("-", "");
  const algorithm = algoRaw === "SHA256" ? "SHA-256" : algoRaw === "SHA512" ? "SHA-512" : "SHA-1";
  const digits = Number(url.searchParams.get("digits") ?? 6);
  const period = Number(url.searchParams.get("period") ?? 30);
  const label = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  const issuer = url.searchParams.get("issuer") ?? (label.includes(":") ? label.split(":")[0] : undefined);
  return {
    secret: base32Decode(secret),
    algorithm,
    digits: Number.isFinite(digits) && digits >= 6 && digits <= 10 ? digits : 6,
    period: Number.isFinite(period) && period > 0 ? period : 30,
    label,
    issuer: issuer ?? undefined,
  };
}

async function hmac(algorithm: TotpConfig["algorithm"], key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("WebCrypto non disponibile");
  // libsodium/WebCrypto vogliono un ArrayBuffer "puro": copiamo per sicurezza.
  const cryptoKey = await subtle.importKey("raw", key.slice().buffer, { name: "HMAC", hash: { name: algorithm } }, false, ["sign"]);
  const sig = await subtle.sign("HMAC", cryptoKey, data.slice().buffer);
  return new Uint8Array(sig);
}

export interface TotpCode {
  code: string;
  /** secondi rimanenti prima del prossimo codice */
  remaining: number;
  period: number;
}

export async function generateTotp(input: string | TotpConfig, now: number = Date.now()): Promise<TotpCode> {
  const cfg = typeof input === "string" ? parseTotp(input) : input;
  const seconds = Math.floor(now / 1000);
  const counter = Math.floor(seconds / cfg.period);
  const msg = new Uint8Array(8);
  // big-endian 64 bit (i 32 bit alti sono 0 per i prossimi secoli)
  new DataView(msg.buffer).setUint32(4, counter >>> 0);
  new DataView(msg.buffer).setUint32(0, Math.floor(counter / 2 ** 32));
  const digest = await hmac(cfg.algorithm, cfg.secret, msg);
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  const code = String(binary % 10 ** cfg.digits).padStart(cfg.digits, "0");
  return { code, remaining: cfg.period - (seconds % cfg.period), period: cfg.period };
}
