import { createHmac } from "node:crypto";

export type Algorithm = "SHA1" | "SHA256" | "SHA512";

export type TOTPConfig = {
  secret: string;
  digits: number;
  period: number;
  algorithm: Algorithm;
};

export type ParsedAccount = TOTPConfig & {
  name: string;
  issuer: string;
};

export type Code = {
  value: string;
  remainingSeconds: number;
};

export function normalizeSecret(secret: string): string {
  return secret.toUpperCase().replace(/[\s\-=]/g, "");
}

export function decodeBase32(secret: string): Buffer {
  const normalized = normalizeSecret(secret);
  if (!normalized) throw new Error("Secret cannot be empty.");

  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const character of normalized) {
    const code = character.charCodeAt(0);
    const digit = code >= 65 && code <= 90 ? code - 65 : code >= 50 && code <= 55 ? code - 24 : -1;
    if (digit < 0) throw new Error(`Invalid Base32 character: ${character}`);

    value = (value << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits -= 8)) & 0xff);
    }
  }

  const decoded = Buffer.from(bytes);
  if (!decoded.length) throw new Error("Secret is too short.");
  return decoded;
}

export function parseInput(input: string, name?: string, issuerOverride?: string): ParsedAccount {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Secret or otpauth URI is required.");

  if (!trimmed.toLowerCase().startsWith("otpauth:")) {
    const accountName = name?.trim();
    if (!accountName) throw new Error("Name is required when entering a Base32 secret.");
    const secret = normalizeSecret(trimmed);
    decodeBase32(secret);
    return { name: accountName, issuer: issuerOverride?.trim() ?? "", secret, digits: 6, period: 30, algorithm: "SHA1" };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("The otpauth URI is invalid.");
  }
  if (url.protocol !== "otpauth:" || url.hostname.toLowerCase() !== "totp") {
    throw new Error("Only otpauth://totp URIs are supported.");
  }

  const parameters = new Map([...url.searchParams].map(([key, value]) => [key.toLowerCase(), value.trim()]));
  const secret = normalizeSecret(parameters.get("secret") ?? "");
  decodeBase32(secret);

  let label: string;
  try {
    label = decodeURIComponent(url.pathname).replace(/^\/+/, "").trim();
  } catch {
    throw new Error("The otpauth URI is invalid.");
  }
  const [labelIssuer, ...labelName] = label.split(":");
  const issuer = issuerOverride?.trim() || parameters.get("issuer") || (labelName.length ? labelIssuer.trim() : "");
  const uriName = (labelName.length ? labelName.join(":") : label).trim();
  const accountName = name?.trim() || uriName || issuer;
  if (!accountName) throw new Error("The otpauth URI is missing an account name.");

  const digits = numberParameter(parameters.get("digits"), 6, "Digits", (value) => value >= 1 && value <= 10);
  const period = numberParameter(parameters.get("period"), 30, "Period", (value) => value > 0);
  const algorithm = (parameters.get("algorithm") || "SHA1").toUpperCase();
  if (algorithm !== "SHA1" && algorithm !== "SHA256" && algorithm !== "SHA512") {
    throw new Error(`Unsupported algorithm: ${algorithm}`);
  }

  return { name: accountName, issuer, secret, digits, period, algorithm };
}

export function generateCode(config: TOTPConfig, date = new Date()): Code {
  const secret = decodeBase32(config.secret);
  const counter = Math.floor(date.getTime() / 1000 / config.period);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac(config.algorithm.replace("SHA", "sha"), secret).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const truncated = ((digest[offset] & 0x7f) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3];
  const value = String(truncated % 10 ** config.digits).padStart(config.digits, "0");
  const seconds = Math.floor(date.getTime() / 1000);
  const remainder = seconds % config.period;

  return { value, remainingSeconds: remainder === 0 ? config.period : config.period - remainder };
}

function numberParameter(raw: string | undefined, fallback: number, title: string, valid: (value: number) => boolean): number {
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || !valid(value)) throw new Error(`${title} is invalid.`);
  return value;
}
