import { createHmac } from "crypto";
import type { VaultService } from "./vault";

export interface TOTPParams {
  secret: string;
  algorithm: "SHA1" | "SHA256" | "SHA512";
  digits: number;
  period: number;
}

export interface TOTPCode {
  code: string;
  remaining: number;
  period: number;
}

function decodeBase32(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = input.replace(/[\s=-]/g, "").toUpperCase();
  let bits = "";
  for (const char of cleaned) {
    const val = alphabet.indexOf(char);
    if (val === -1) throw new Error("Invalid base32 encoding in secret");
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return Buffer.from(bytes);
}

export function generateTOTP(params: TOTPParams, timestamp?: number): TOTPCode {
  const now = timestamp ?? Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / params.period);

  const counterBuf = Buffer.alloc(8);
  counterBuf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuf.writeUInt32BE(counter >>> 0, 4);

  const key = decodeBase32(params.secret);
  const alg = params.algorithm.toLowerCase();
  const hmac = createHmac(alg, key).update(counterBuf).digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, params.digits);
  const code = otp.toString().padStart(params.digits, "0");
  const remaining = params.period - (now % params.period);

  return { code, remaining, period: params.period };
}

export function generateCodeForService(service: VaultService): TOTPCode {
  return generateTOTP({
    secret: service.secret,
    algorithm: service.algorithm,
    digits: service.digits,
    period: service.period,
  });
}
