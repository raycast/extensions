import { createDecipheriv, createHash, pbkdf2Sync } from "crypto";
import { readFileSync, statSync } from "fs";
import type { VaultService } from "./vault";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

function deriveServiceId(
  issuer: string,
  account: string,
  secret: string,
): string {
  return createHash("sha256")
    .update(`${issuer}\0${account}\0${secret}`)
    .digest("hex")
    .slice(0, 32);
}

interface TwoFASService {
  name: string;
  secret: string;
  otp: {
    issuer?: string;
    account?: string;
    digits: number;
    period: number;
    algorithm: string;
    tokenType: string;
  };
  order?: { position: number };
}

interface TwoFASExport {
  schemaVersion: number;
  services?: TwoFASService[];
  servicesEncrypted?: unknown;
  reference?: string;
}

export class InvalidPasswordError extends Error {
  constructor() {
    super("Invalid export password");
    this.name = "InvalidPasswordError";
  }
}

export class InvalidFormatError extends Error {
  constructor(detail: string) {
    super(`Invalid 2FAS export: ${detail}`);
    this.name = "InvalidFormatError";
  }
}

function decryptPayload(encoded: string, password: string): string {
  const parts = encoded.split(":");
  if (parts.length !== 3) {
    throw new InvalidFormatError("expected data:salt:iv format");
  }
  const [dataB64, saltB64, ivB64] = parts;
  const data = Buffer.from(dataB64, "base64");
  const salt = Buffer.from(saltB64, "base64");
  const iv = Buffer.from(ivB64, "base64");
  if (data.length <= 16 || salt.length === 0 || iv.length === 0) {
    throw new InvalidFormatError("malformed encrypted payload");
  }

  const key = pbkdf2Sync(password, salt, 10000, 32, "sha256");

  const tagStart = data.length - 16;
  const ciphertext = data.subarray(0, tagStart);
  const tag = data.subarray(tagStart);

  let decipher;
  try {
    decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
  } catch {
    // Structural defects (wrong IV/tag length) are malformation, not a
    // wrong password. Authentication failure surfaces later at final().
    throw new InvalidFormatError("malformed encrypted payload");
  }
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf-8");
}

function normalizeAlgorithm(alg: string): "SHA1" | "SHA256" | "SHA512" {
  const upper = alg.toUpperCase();
  if (upper === "SHA256" || upper === "SHA-256") return "SHA256";
  if (upper === "SHA512" || upper === "SHA-512") return "SHA512";
  return "SHA1";
}

function mapService(svc: TwoFASService): VaultService | null {
  const tokenType = svc.otp.tokenType?.toUpperCase();
  if (tokenType !== "TOTP") return null;
  if (!svc.secret) return null;

  const issuer = svc.otp.issuer || "";
  const account = svc.otp.account || "";
  return {
    id: deriveServiceId(issuer, account, svc.secret),
    name: svc.name,
    issuer,
    account,
    secret: svc.secret,
    algorithm: normalizeAlgorithm(svc.otp.algorithm),
    digits: svc.otp.digits || 6,
    period: svc.otp.period || 30,
  };
}

export function parse2FASExport(
  filePath: string,
  password?: string,
): VaultService[] {
  let size: number;
  try {
    size = statSync(filePath).size;
  } catch {
    throw new InvalidFormatError("file not readable");
  }
  if (size > MAX_IMPORT_BYTES) {
    throw new InvalidFormatError("file too large (max 5 MB)");
  }
  const raw = readFileSync(filePath, "utf-8");
  let data: TwoFASExport;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new InvalidFormatError("not valid JSON");
  }

  if (!data.schemaVersion) {
    throw new InvalidFormatError("missing schemaVersion");
  }

  let services: TwoFASService[] = [];

  if (data.servicesEncrypted) {
    if (typeof data.servicesEncrypted !== "string") {
      throw new InvalidFormatError("malformed encrypted payload");
    }
    if (!password) {
      throw new InvalidPasswordError();
    }
    try {
      const decrypted = decryptPayload(data.servicesEncrypted, password);
      services = JSON.parse(decrypted);
    } catch (err) {
      if (err instanceof InvalidFormatError) throw err;
      throw new InvalidPasswordError();
    }
  } else if (data.services) {
    services = data.services;
  } else {
    throw new InvalidFormatError("no services found");
  }

  return services.map(mapService).filter((s): s is VaultService => s !== null);
}
