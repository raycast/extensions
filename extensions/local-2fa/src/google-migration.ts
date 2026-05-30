import type { OtpauthPayload, TotpAlgorithm, TotpDigits } from "./types";

type Cursor = { offset: number };

function readVarint(buf: Buffer, cursor: Cursor): number {
  let result = 0;
  let shift = 0;
  while (cursor.offset < buf.length) {
    const byte = buf[cursor.offset++];
    result |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) {
      return result >>> 0;
    }
    shift += 7;
    if (shift > 35) {
      throw new Error("Varint too large");
    }
  }
  throw new Error("Truncated varint");
}

function readLengthDelimited(buf: Buffer, cursor: Cursor): Buffer {
  const len = readVarint(buf, cursor);
  const start = cursor.offset;
  const end = start + len;
  if (end > buf.length) {
    throw new Error("Truncated length-delimited field");
  }
  cursor.offset = end;
  return buf.subarray(start, end);
}

function toBase32(bytes: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const b of bytes) {
    bits += b.toString(2).padStart(8, "0");
  }

  let out = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0");
    out += alphabet[parseInt(chunk, 2)];
  }
  return out;
}

function algorithmFromEnum(value: number): TotpAlgorithm {
  if (value === 1) {
    return "SHA1";
  }
  if (value === 2) {
    return "SHA256";
  }
  if (value === 4) {
    return "SHA512";
  }
  // value === 3 → SHA384 (no soportado por TotpAlgorithm)
  throw new Error(`Unsupported algorithm enum in migration payload: ${value}`);
}

function digitsFromEnum(value: number): TotpDigits {
  if (value === 2) {
    return 8;
  }
  return 6;
}

function parseOtpParameters(message: Buffer): OtpauthPayload | null {
  const cursor: Cursor = { offset: 0 };
  let secret: Buffer | null = null;
  let account = "";
  let issuer = "";
  let algorithm = 1;
  let digits = 1;
  let type = 0;

  while (cursor.offset < message.length) {
    const tag = readVarint(message, cursor);
    const field = tag >> 3;
    const wire = tag & 0x07;

    if (field === 1 && wire === 2) {
      secret = Buffer.from(readLengthDelimited(message, cursor));
      continue;
    }
    if (field === 2 && wire === 2) {
      account = readLengthDelimited(message, cursor).toString("utf8");
      continue;
    }
    if (field === 3 && wire === 2) {
      issuer = readLengthDelimited(message, cursor).toString("utf8");
      continue;
    }
    if (field === 4 && wire === 0) {
      algorithm = readVarint(message, cursor);
      continue;
    }
    if (field === 5 && wire === 0) {
      digits = readVarint(message, cursor);
      continue;
    }
    if (field === 6 && wire === 0) {
      type = readVarint(message, cursor);
      continue;
    }

    if (wire === 0) {
      readVarint(message, cursor);
    } else if (wire === 2) {
      readLengthDelimited(message, cursor);
    } else {
      throw new Error("Unsupported wire type in Google Authenticator payload");
    }
  }

  if (type !== 2) {
    return null;
  }
  if (!secret || !account.trim()) {
    return null;
  }

  // Si el algoritmo no es soportado (p. ej. SHA384 o ALGORITHM_UNSPECIFIED
  // codificado explícitamente), omitimos esa cuenta en lugar de abortar
  // toda la importación y descartar el resto de cuentas válidas.
  let resolvedAlgorithm: TotpAlgorithm;
  try {
    resolvedAlgorithm = algorithmFromEnum(algorithm);
  } catch {
    return null;
  }

  return {
    issuer: issuer.trim() || "Unknown",
    account: account.trim(),
    secretBase32: toBase32(secret),
    digits: digitsFromEnum(digits),
    period: 30,
    algorithm: resolvedAlgorithm,
  };
}

const MAX_MIGRATION_URL_LENGTH = 64 * 1024;
const MAX_MIGRATION_PAYLOAD_BYTES = 64 * 1024;
const MAX_MIGRATION_ACCOUNTS = 1000;
const MAX_MIGRATION_ITERATIONS = 100_000;

export function parseGoogleMigrationUrl(input: string): OtpauthPayload[] {
  if (input.length > MAX_MIGRATION_URL_LENGTH) {
    throw new Error("Otpauth-migration URL is too long");
  }

  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Invalid URL");
  }

  if (url.protocol !== "otpauth-migration:") {
    throw new Error("URL must start with otpauth-migration://");
  }

  const data = url.searchParams.get("data");
  if (!data) {
    throw new Error("Missing data parameter");
  }

  const normalizedData = data.replace(/-/g, "+").replace(/_/g, "/");
  const payload = Buffer.from(normalizedData, "base64");
  if (payload.length > MAX_MIGRATION_PAYLOAD_BYTES) {
    throw new Error("Otpauth-migration payload is too large");
  }

  const cursor: Cursor = { offset: 0 };
  const results: OtpauthPayload[] = [];
  let iterations = 0;

  while (cursor.offset < payload.length) {
    if (++iterations > MAX_MIGRATION_ITERATIONS) {
      throw new Error("Otpauth-migration payload has too many fields");
    }
    if (results.length > MAX_MIGRATION_ACCOUNTS) {
      throw new Error(
        `Otpauth-migration payload exceeds ${MAX_MIGRATION_ACCOUNTS} accounts`,
      );
    }
    const tag = readVarint(payload, cursor);
    const field = tag >> 3;
    const wire = tag & 0x07;

    if (field === 1 && wire === 2) {
      const otpMessage = readLengthDelimited(payload, cursor);
      const parsed = parseOtpParameters(otpMessage);
      if (parsed) {
        results.push(parsed);
      }
      continue;
    }

    if (wire === 0) {
      readVarint(payload, cursor);
    } else if (wire === 2) {
      readLengthDelimited(payload, cursor);
    } else {
      throw new Error("Unsupported export format");
    }
  }

  if (!results.length) {
    throw new Error("No TOTP accounts found in payload");
  }

  return results;
}
