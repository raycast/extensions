import crypto from "node:crypto";

export type HashAlgorithm = "SHA1" | "SHA256" | "SHA512";

export type TotpEntry = {
  id: string;
  label: string;
  issuer?: string;
  account?: string;
  secret: Buffer;
  algorithm: HashAlgorithm;
  digits: number;
  period: number;
};

export type ManualTotpInput = {
  name: string;
  secret: string;
};

export type StoredTotpEntry = {
  name: string;
  account?: string;
  secret: string;
  algorithm?: HashAlgorithm;
  digits?: number;
  period?: number;
};

type JsonRecord = Record<string, unknown>;

const DEFAULT_ALGORITHM: HashAlgorithm = "SHA1";
const DEFAULT_DIGITS = 6;
const DEFAULT_PERIOD = 30;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function parseAuthenticatorExport(contents: string): TotpEntry[] {
  const trimmed = contents.trim();
  if (!trimmed) {
    throw new Error("The export file is empty.");
  }

  const urlEntries = parseOtpUrls(trimmed);
  if (urlEntries.length > 0) {
    return dedupeEntries(urlEntries);
  }

  const json = tryParseJson(trimmed);
  if (json !== undefined) {
    const jsonEntries = parseJsonExport(json);
    if (jsonEntries.length > 0) {
      return dedupeEntries(jsonEntries);
    }
  }

  throw new Error("No supported TOTP entries were found in this export.");
}

export function currentTotp(entry: TotpEntry, now = Date.now()): { code: string; remainingSeconds: number } {
  const counter = Math.floor(now / 1000 / entry.period);
  const code = hotp(entry.secret, counter, entry.digits, entry.algorithm);
  const elapsed = Math.floor(now / 1000) % entry.period;

  return {
    code,
    remainingSeconds: entry.period - elapsed,
  };
}

export function createManualTotpEntry(input: ManualTotpInput): TotpEntry {
  const name = stringOrUndefined(input.name);
  if (!name) {
    throw new Error("Name is required.");
  }

  return normalizeEntry({
    label: name,
    issuer: name,
    secret: decodeBase32(input.secret),
    algorithm: DEFAULT_ALGORITHM,
    digits: DEFAULT_DIGITS,
    period: DEFAULT_PERIOD,
  });
}

export function serializeStoredEntries(entries: TotpEntry[]): string {
  return JSON.stringify(entries.map(toStoredEntry));
}

export function parseStoredEntries(value: string | undefined): TotpEntry[] {
  if (!value) {
    return [];
  }

  const parsed = JSON.parse(value) as unknown;
  const entries = Array.isArray(parsed) ? parsed : isRecord(parsed) && Array.isArray(parsed.entries) ? parsed.entries : [];

  return dedupeEntries(entries.flatMap((entry) => (isRecord(entry) ? parseStoredEntry(entry) : [])));
}

export function encodeTotpSecret(entry: TotpEntry): string {
  return encodeBase32(entry.secret);
}

function toStoredEntry(entry: TotpEntry): StoredTotpEntry {
  return {
    name: entry.issuer ?? entry.label,
    account: entry.account,
    secret: encodeBase32(entry.secret),
    algorithm: entry.algorithm,
    digits: entry.digits,
    period: entry.period,
  };
}

function parseStoredEntry(entry: JsonRecord): TotpEntry[] {
  const name = stringOrUndefined(entry.name) ?? stringOrUndefined(entry.issuer) ?? stringOrUndefined(entry.label);
  const secret = stringOrUndefined(entry.secret);
  if (!name || !secret) {
    return [];
  }

  return [
    normalizeEntry({
      label: name,
      issuer: name,
      account: stringOrUndefined(entry.account),
      secret: decodeBase32(secret),
      algorithm: normalizeAlgorithm(entry.algorithm),
      digits: normalizeDigits(entry.digits),
      period: normalizePeriod(entry.period),
    }),
  ];
}

function hotp(secret: Buffer, counter: number, digits: number, algorithm: HashAlgorithm): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuffer.writeUInt32BE(counter >>> 0, 4);

  const digest = crypto.createHmac(algorithm.toLowerCase(), secret).update(counterBuffer).digest();
  const lastByte = digest.at(-1);
  if (lastByte === undefined) {
    throw new Error("Could not generate TOTP digest.");
  }

  const offset = lastByte & 0x0f;
  const first = digest[offset];
  const second = digest[offset + 1];
  const third = digest[offset + 2];
  const fourth = digest[offset + 3];
  if (first === undefined || second === undefined || third === undefined || fourth === undefined) {
    throw new Error("Could not generate TOTP code.");
  }

  const binary =
    ((first & 0x7f) << 24) | ((second & 0xff) << 16) | ((third & 0xff) << 8) | (fourth & 0xff);

  return String(binary % 10 ** digits).padStart(digits, "0");
}

function parseOtpUrls(contents: string): TotpEntry[] {
  const matches = contents.match(/otpauth(?:-migration)?:\/\/[^\s"'<>]+/g) ?? [];
  return matches.flatMap((rawUrl) => {
    const cleaned = rawUrl.replace(/[),.;\]]+$/, "");
    if (cleaned.startsWith("otpauth-migration://")) {
      return parseGoogleMigrationUrl(cleaned);
    }

    return parseOtpAuthUrl(cleaned);
  });
}

function parseOtpAuthUrl(rawUrl: string): TotpEntry[] {
  const url = new URL(rawUrl);
  if (url.protocol !== "otpauth:" || url.hostname.toLowerCase() !== "totp") {
    return [];
  }

  const secret = url.searchParams.get("secret");
  if (!secret) {
    return [];
  }

  const rawLabel = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const [issuerFromLabel, accountFromLabel] = rawLabel.includes(":")
    ? rawLabel.split(/:(.*)/s).slice(0, 2)
    : [undefined, rawLabel];
  const issuer = stringOrUndefined(url.searchParams.get("issuer")) ?? stringOrUndefined(issuerFromLabel);
  const account = stringOrUndefined(accountFromLabel);
  const label = [issuer, account].filter(Boolean).join(": ") || rawLabel || "TOTP";

  return [
    normalizeEntry({
      label,
      issuer,
      account,
      secret: decodeBase32(secret),
      algorithm: normalizeAlgorithm(url.searchParams.get("algorithm")),
      digits: normalizeDigits(url.searchParams.get("digits")),
      period: normalizePeriod(url.searchParams.get("period")),
    }),
  ];
}

function parseGoogleMigrationUrl(rawUrl: string): TotpEntry[] {
  const url = new URL(rawUrl);
  const encoded = url.searchParams.get("data");
  if (!encoded) {
    return [];
  }

  const payload = decodeBase64Url(encoded);
  const fields = readProtoFields(payload);
  const entries: TotpEntry[] = [];

  for (const field of fields) {
    if (field.fieldNumber !== 1 || !Buffer.isBuffer(field.value)) {
      continue;
    }

    const otp = Object.fromEntries(
      readProtoFields(field.value).map((nested) => [nested.fieldNumber, nested.value]),
    ) as Record<number, string | number | Buffer>;

    if (!Buffer.isBuffer(otp[1])) {
      continue;
    }

    const issuer = stringOrUndefined(typeof otp[3] === "string" ? otp[3] : undefined);
    const account = stringOrUndefined(typeof otp[2] === "string" ? otp[2] : undefined);
    const label = [issuer, account].filter(Boolean).join(": ") || account || issuer || "Google Authenticator";

    entries.push(
      normalizeEntry({
        label,
        issuer,
        account,
        secret: otp[1],
        algorithm: googleAlgorithm(typeof otp[4] === "number" ? otp[4] : undefined),
        digits: typeof otp[5] === "number" && otp[5] === 2 ? 8 : 6,
        period: DEFAULT_PERIOD,
      }),
    );
  }

  return entries;
}

function parseJsonExport(json: unknown): TotpEntry[] {
  if (isRecord(json) && json.version === 1 && isRecord(json.header) && json.db === undefined && json.entries === undefined) {
    throw new Error("This looks like an encrypted Aegis export. Export without encryption or decrypt it locally first.");
  }

  const privateEntries = parsePrivate2faJson(json);
  if (privateEntries.length > 0) {
    return privateEntries;
  }

  return [
    ...parseAegisJson(json),
    ...parse2fasJson(json),
    ...parseBitwardenJson(json),
    ...parseGenericJson(json),
  ];
}

function parsePrivate2faJson(json: unknown): TotpEntry[] {
  if (!isRecord(json) || json.format !== "private-2fa-codes" || !Array.isArray(json.entries)) {
    return [];
  }

  return json.entries.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    const name = stringOrUndefined(entry.name);
    const secret = stringOrUndefined(entry.secret);
    if (!name || !secret) {
      return [];
    }

    return [
      normalizeEntry({
        label: name,
        issuer: name,
        account: stringOrUndefined(entry.account),
        secret: decodeBase32(secret),
        algorithm: normalizeAlgorithm(entry.algorithm),
        digits: normalizeDigits(entry.digits),
        period: normalizePeriod(entry.period),
      }),
    ];
  });
}

function parseAegisJson(json: unknown): TotpEntry[] {
  const db = isRecord(json) && isRecord(json.db) ? json.db : json;
  const entries = isRecord(db) && Array.isArray(db.entries) ? db.entries : [];

  return entries.flatMap((entry) => {
    if (!isRecord(entry) || entry.type !== "totp" || !isRecord(entry.info)) {
      return [];
    }

    const secret = stringOrUndefined(entry.info.secret);
    if (!secret) {
      return [];
    }

    const issuer = stringOrUndefined(entry.issuer);
    const account = stringOrUndefined(entry.name);

    return [
      normalizeEntry({
        label: [issuer, account].filter(Boolean).join(": ") || account || issuer || "Aegis",
        issuer,
        account,
        secret: decodeBase32(secret),
        algorithm: normalizeAlgorithm(entry.info.algo),
        digits: normalizeDigits(entry.info.digits),
        period: normalizePeriod(entry.info.period),
      }),
    ];
  });
}

function parse2fasJson(json: unknown): TotpEntry[] {
  const services = isRecord(json) && Array.isArray(json.services) ? json.services : [];

  return services.flatMap((service) => {
    if (!isRecord(service)) {
      return [];
    }

    const otp = isRecord(service.otp) ? service.otp : service;
    const secret = stringOrUndefined(otp.secret);
    if (!secret) {
      return [];
    }

    const issuer = stringOrUndefined(service.issuer) ?? stringOrUndefined(service.name);
    const account = stringOrUndefined(service.label) ?? stringOrUndefined(service.account);

    return [
      normalizeEntry({
        label: [issuer, account].filter(Boolean).join(": ") || account || issuer || "2FAS",
        issuer,
        account,
        secret: decodeBase32(secret),
        algorithm: normalizeAlgorithm(otp.algorithm),
        digits: normalizeDigits(otp.digits),
        period: normalizePeriod(otp.period),
      }),
    ];
  });
}

function parseBitwardenJson(json: unknown): TotpEntry[] {
  const items = isRecord(json) && Array.isArray(json.items) ? json.items : [];

  return items.flatMap((item) => {
    if (!isRecord(item) || !isRecord(item.login)) {
      return [];
    }

    const totp = stringOrUndefined(item.login.totp);
    if (!totp) {
      return [];
    }

    if (totp.startsWith("otpauth://")) {
      return parseOtpAuthUrl(totp).map((entry) => ({
        ...entry,
        label: stringOrUndefined(item.name) ?? entry.label,
      }));
    }

    const label = stringOrUndefined(item.name) ?? "Bitwarden";
    return [
      normalizeEntry({
        label,
        account: label,
        secret: decodeBase32(totp),
        algorithm: DEFAULT_ALGORITHM,
        digits: DEFAULT_DIGITS,
        period: DEFAULT_PERIOD,
      }),
    ];
  });
}

function parseGenericJson(json: unknown): TotpEntry[] {
  const urls: TotpEntry[] = [];
  const candidates: JsonRecord[] = [];

  walkJson(json, (value) => {
    if (typeof value === "string" && value.includes("otpauth://")) {
      urls.push(...parseOtpUrls(value));
    } else if (isRecord(value)) {
      candidates.push(value);
    }
  });

  const records = candidates.flatMap((record) => {
    const type = stringOrUndefined(record.type)?.toLowerCase();
    const secret = stringOrUndefined(record.secret) ?? stringOrUndefined(record.totpSecret);

    if (!secret || (type && type !== "totp")) {
      return [];
    }

    const issuer = stringOrUndefined(record.issuer);
    const account = stringOrUndefined(record.account) ?? stringOrUndefined(record.name) ?? stringOrUndefined(record.label);

    try {
      return [
        normalizeEntry({
          label: [issuer, account].filter(Boolean).join(": ") || account || issuer || "TOTP",
          issuer,
          account,
          secret: decodeBase32(secret),
          algorithm: normalizeAlgorithm(record.algorithm ?? record.algo),
          digits: normalizeDigits(record.digits),
          period: normalizePeriod(record.period),
        }),
      ];
    } catch {
      return [];
    }
  });

  return [...urls, ...records];
}

function normalizeEntry(entry: Omit<TotpEntry, "id">): TotpEntry {
  return {
    ...entry,
    id: crypto.createHash("sha256").update(entry.label).update(entry.secret).digest("hex").slice(0, 16),
  };
}

function dedupeEntries(entries: TotpEntry[]): TotpEntry[] {
  return Array.from(new Map(entries.map((entry) => [entry.id, entry])).values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

function decodeBase32(input: string): Buffer {
  const normalized = input.toUpperCase().replace(/[\s=-]/g, "");
  let bits = "";

  for (const character of normalized) {
    const value = BASE32_ALPHABET.indexOf(character);
    if (value === -1) {
      throw new Error("Invalid base32 secret in export.");
    }
    bits += value.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }

  return Buffer.from(bytes);
}

function encodeBase32(buffer: Buffer): string {
  let bits = "";
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, "0");
  }

  let output = "";
  for (let offset = 0; offset < bits.length; offset += 5) {
    const chunk = bits.slice(offset, offset + 5).padEnd(5, "0");
    output += BASE32_ALPHABET[Number.parseInt(chunk, 2)];
  }

  return output;
}

function decodeBase64Url(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="), "base64");
}

function readProtoFields(buffer: Buffer): Array<{ fieldNumber: number; value: number | string | Buffer }> {
  const fields: Array<{ fieldNumber: number; value: number | string | Buffer }> = [];
  let offset = 0;

  while (offset < buffer.length) {
    const tag = readVarint(buffer, offset);
    offset = tag.offset;

    const fieldNumber = tag.value >> 3;
    const wireType = tag.value & 0x07;

    if (wireType === 0) {
      const value = readVarint(buffer, offset);
      offset = value.offset;
      fields.push({ fieldNumber, value: value.value });
    } else if (wireType === 2) {
      const length = readVarint(buffer, offset);
      offset = length.offset;
      const value = buffer.subarray(offset, offset + length.value);
      offset += length.value;
      fields.push({ fieldNumber, value: looksLikeText(value) ? value.toString("utf8") : value });
    } else {
      throw new Error(`Unsupported protobuf wire type ${wireType}.`);
    }
  }

  return fields;
}

function readVarint(buffer: Buffer, offset: number): { value: number; offset: number } {
  let result = 0;
  let shift = 0;

  while (offset < buffer.length) {
    const byte = buffer[offset];
    if (byte === undefined) {
      throw new Error("Invalid protobuf varint.");
    }

    result |= (byte & 0x7f) << shift;
    offset += 1;

    if ((byte & 0x80) === 0) {
      return { value: result, offset };
    }

    shift += 7;
  }

  throw new Error("Invalid protobuf varint.");
}

function looksLikeText(buffer: Buffer): boolean {
  if (buffer.length === 0) {
    return true;
  }

  return buffer.every((byte) => byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126) || byte >= 128);
}

function normalizeAlgorithm(value: unknown): HashAlgorithm {
  const normalized = stringOrUndefined(value)?.replace(/[-_]/g, "").toUpperCase();

  if (normalized === "SHA256") {
    return "SHA256";
  }

  if (normalized === "SHA512") {
    return "SHA512";
  }

  return DEFAULT_ALGORITHM;
}

function googleAlgorithm(value: number | undefined): HashAlgorithm {
  if (value === 2) {
    return "SHA256";
  }

  if (value === 3) {
    return "SHA512";
  }

  return DEFAULT_ALGORITHM;
}

function normalizeDigits(value: unknown): number {
  const digits = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return digits === 8 ? 8 : DEFAULT_DIGITS;
}

function normalizePeriod(value: unknown): number {
  const period = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(period) && period > 0 ? period : DEFAULT_PERIOD;
}

function tryParseJson(contents: string): unknown {
  try {
    return JSON.parse(contents);
  } catch {
    return undefined;
  }
}

function walkJson(value: unknown, visit: (value: unknown) => void): void {
  visit(value);

  if (Array.isArray(value)) {
    for (const child of value) {
      walkJson(child, visit);
    }
  } else if (isRecord(value)) {
    for (const child of Object.values(value)) {
      walkJson(child, visit);
    }
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
