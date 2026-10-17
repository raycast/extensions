/**
 * Pure helper functions. No side effects, so they can be unit tested and reused freely.
 */
import { createHash, randomBytes, randomInt as cryptoRandomInt } from "crypto";

/* ------------------------------- Timestamp ------------------------------- */

/** Normalize a common time string into a Date; returns null when it cannot be parsed */
export function parseDateFlexible(input: string): Date | null {
  const raw = input.trim();
  if (!raw) return null;

  if (/^\d{10}$/.test(raw)) return new Date(Number(raw) * 1000);
  if (/^\d{13}$/.test(raw)) return new Date(Number(raw));
  if (/^\d{1,9}$/.test(raw)) return new Date(Number(raw) * 1000);

  const m = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (m) {
    const [, y, mo, d, h = "0", mi = "0", s = "0"] = m;
    const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
    // Date rolls impossible values forward (2024-02-30 becomes 2024-03-01), so reject the
    // input unless every submitted field survived the round trip.
    const exact =
      date.getFullYear() === Number(y) &&
      date.getMonth() === Number(mo) - 1 &&
      date.getDate() === Number(d) &&
      date.getHours() === Number(h) &&
      date.getMinutes() === Number(mi) &&
      date.getSeconds() === Number(s);
    return exact ? date : null;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const pad2 = (n: number, len = 2) => String(n).padStart(len, "0");

/** Build the set of commonly used representations of a single instant */
export function formatTimestamp(date: Date) {
  const seconds = Math.floor(date.getTime() / 1000);
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const offset = `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
  const localDatetime = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(
    date.getHours(),
  )}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;

  return {
    seconds,
    milliseconds: date.getTime(),
    micros: date.getTime() * 1000,
    iso: date.toISOString(),
    isoLocal: `${localDatetime.slice(0, 10)}T${localDatetime.slice(11)}${offset}`,
    datetime: localDatetime,
    date: `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
    time: `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`,
    utc: date.toISOString().replace("T", " ").replace("Z", " UTC"),
    rfc2822: date.toUTCString(),
    relative: humanizeRelative(date),
    timezone: `UTC${offset}`,
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()],
  };
}

/* ---------------------- Previewing and displaying long content ---------------------- */

/** Preview limits for lists. Defaults live here so they can be tuned in one place. */
export const PREVIEW_LIMITS = {
  /** Maximum characters in a single-line title preview */
  titleChars: 220,
  /** Maximum characters in a multi-line preview */
  multilineChars: 220,
  /** Maximum lines in a multi-line preview */
  multilineLines: 6,
  /** Maximum characters rendered on a detail page; anything beyond stays copyable only */
  detailChars: 500_000,
} as const;

/** Collapse whitespace, clip to a single-line preview and note how much was hidden */
export function previewTitle(value: string, max: number = PREVIEW_LIMITS.titleChars): string {
  const flat = value.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max)}… (+${flat.length - max} chars hidden)`;
}

/** Multi-line preview: keep the line structure, cap both the line count and the character count */
export function previewMultiline(
  value: string,
  maxChars: number = PREVIEW_LIMITS.multilineChars,
  maxLines: number = PREVIEW_LIMITS.multilineLines,
): string {
  const lines = value.split("\n");
  const head = lines.slice(0, maxLines).join("\n");
  const clippedLines = lines.length > maxLines;
  let out = head.length > maxChars ? `${head.slice(0, maxChars)}…` : head;
  if (clippedLines) out += "…";
  return out;
}

/** Clamp content to the render limit, reporting whether anything was dropped */
export function clampDetail(
  value: string,
  max: number = PREVIEW_LIMITS.detailChars,
): { text: string; truncated: boolean } {
  return value.length <= max ? { text: value, truncated: false } : { text: value.slice(0, max), truncated: true };
}

/** Content size summary: characters / lines / longest line, used in detail headers and subtitles */
export function textMeta(value: string): { chars: number; lines: number; longestLine: number; bytes: number } {
  const lines = value ? value.split("\n") : [];
  return {
    chars: value.length,
    lines: value.length ? lines.length : 0,
    longestLine: lines.reduce((max, line) => Math.max(max, line.length), 0),
    bytes: new TextEncoder().encode(value).length,
  };
}

/**
 * Live value table for the zero-input case: the most useful representations of "now".
 * Based on local time; shown when the input field is left empty.
 */
export function defaultTimestampRows(now: Date = new Date()) {
  const f = formatTimestamp(now);
  return [
    { label: "Current time (YYYY-MM-DD HH:mm:ss)", value: f.datetime },
    { label: "Current timestamp (seconds)", value: String(f.seconds) },
    { label: "Current timestamp (milliseconds)", value: String(f.milliseconds) },
    { label: "ISO 8601 (UTC)", value: f.iso },
    { label: "ISO 8601 (local timezone)", value: f.isoLocal },
    { label: "Date (YYYY-MM-DD)", value: f.date },
    { label: "Time (HH:mm:ss)", value: f.time },
    { label: "UTC string", value: f.utc },
    { label: "RFC 2822", value: f.rfc2822 },
    { label: "Timestamp (microseconds)", value: String(f.micros) },
    { label: "Timezone offset", value: f.timezone },
    {
      label: "End of today (23:59:59) timestamp (seconds)",
      value: String(
        Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime() / 1000),
      ),
    },
    {
      label: "Start of this week (Monday 00:00:00) timestamp (seconds)",
      value: String(Math.floor(weekStart(now).getTime() / 1000)),
    },
  ];
}

/** Monday 00:00:00 of the week the date falls in (local timezone) */
export function weekStart(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - diff, 0, 0, 0, 0);
}

/** Human readable distance from now, e.g. "3 hours ago" or "in 2 hours" */
export function humanizeRelative(date: Date, now: Date = new Date()): string {
  const diff = date.getTime() - now.getTime();
  const abs = Math.abs(diff);
  if (abs < 1000) return "just now";
  const future = diff >= 0;
  // Each entry is [upper bound of the unit, unit name, unit in milliseconds]
  const units: Array<[number, string, number]> = [
    [60 * 1000, "second", 1000],
    [60 * 60 * 1000, "minute", 60 * 1000],
    [24 * 60 * 60 * 1000, "hour", 60 * 60 * 1000],
    [30 * 24 * 60 * 60 * 1000, "day", 24 * 60 * 60 * 1000],
    [365 * 24 * 60 * 60 * 1000, "month", 30 * 24 * 60 * 60 * 1000],
    [Number.MAX_SAFE_INTEGER, "year", 365 * 24 * 60 * 60 * 1000],
  ];
  for (const [limit, unit, size] of units) {
    if (abs < limit) {
      const count = Math.round(abs / size);
      const plural = count === 1 ? unit : `${unit}s`;
      return future ? `in ${count} ${plural}` : `${count} ${plural} ago`;
    }
  }
  return "unknown";
}

/* ----------------------------- URL encode/decode ----------------------------- */

export enum UrlMode {
  Component = "component",
  Uri = "uri",
}

export function urlEncode(input: string, mode: UrlMode = UrlMode.Component): string {
  return mode === UrlMode.Uri ? encodeURI(input) : encodeURIComponent(input);
}

/** Lenient decode: fall back to the original string instead of throwing on malformed escapes */
export function urlDecode(input: string, mode: UrlMode = UrlMode.Component): string {
  try {
    return mode === UrlMode.Uri ? decodeURI(input) : decodeURIComponent(input);
  } catch {
    return input;
  }
}

/** Parse a query string into pairs (preserves repeated keys and decodes + as space) */
export function parseQueryString(input: string): Array<{ key: string; value: string }> {
  const cleaned = input
    .replace(/^[^?#]*\?/, "")
    .replace(/^[?&]/, "")
    .replace(/#.*$/, "");
  if (!cleaned.trim()) return [];
  return cleaned
    .split("&")
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf("=");
      const key = idx === -1 ? pair : pair.slice(0, idx);
      const value = idx === -1 ? "" : pair.slice(idx + 1);
      try {
        return {
          key: decodeURIComponent(key.replace(/\+/g, " ")),
          value: decodeURIComponent(value.replace(/\+/g, " ")),
        };
      } catch {
        return { key, value };
      }
    });
}

/** Build a query string out of key/value pairs */
export function buildQueryString(pairs: Array<{ key: string; value: string }>): string {
  return pairs
    .filter((p) => p.key)
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join("&");
}

/* --------------------------------- Base64 --------------------------------- */

export function base64Encode(input: string, urlSafe = false): string {
  const encoded = Buffer.from(input, "utf8").toString("base64");
  return urlSafe ? encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : encoded;
}

export function base64Decode(input: string): string {
  const normalized = input.trim().replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

export function hexEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("hex");
}

export function hexDecode(input: string): string {
  const clean = input.trim().replace(/^0x/i, "").replace(/\s+/g, "");
  if (clean.length % 2 !== 0) throw new Error("A hex string must have an even number of digits");
  return Buffer.from(clean, "hex").toString("utf8");
}

export function binaryEncode(input: string): string {
  return [...Buffer.from(input, "utf8")].map((b) => b.toString(2).padStart(8, "0")).join(" ");
}

export function binaryDecode(input: string): string {
  const groups = input.trim().split(/\s+/).filter(Boolean);
  return Buffer.from(groups.map((g) => parseInt(g, 2))).toString("utf8");
}

/* ---------------------------------- Hash ---------------------------------- */

export type HashAlgorithm = "md5" | "sha1" | "sha256" | "sha512";

export function hashText(input: string, algorithm: HashAlgorithm): string {
  return createHash(algorithm).update(input, "utf8").digest("hex");
}

export function hashAll(input: string): Record<HashAlgorithm, string> {
  return {
    md5: hashText(input, "md5"),
    sha1: hashText(input, "sha1"),
    sha256: hashText(input, "sha256"),
    sha512: hashText(input, "sha512"),
  };
}

let crc32Table: number[] | null = null;

export function crc32(input: string): string {
  if (!crc32Table) {
    crc32Table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crc32Table[n] = c >>> 0;
    }
  }
  const table = crc32Table;
  let crc = 0xffffffff;
  for (const byte of Buffer.from(input, "utf8")) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}

/* ---------------------------------- UUID ---------------------------------- */

export function uuidV4(): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuid(bytes);
}

/** UUID v7: the first 48 bits hold a millisecond timestamp, so the values sort by time */
export function uuidV7(timestamp: number = Date.now()): string {
  const bytes = randomBytes(16);
  const ts = BigInt(timestamp);
  for (let i = 0; i < 6; i++) bytes[i] = Number((ts >> BigInt((5 - i) * 8)) & 0xffn);
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuid(bytes);
}

function formatUuid(bytes: Buffer): string {
  const hex = bytes.toString("hex");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** ULID: 26 characters of Crockford Base32, sortable by time */
export function ulid(timestamp: number = Date.now()): string {
  let ts = "";
  let t = timestamp;
  for (let i = 0; i < 10; i++) {
    ts = CROCKFORD[t % 32] + ts;
    t = Math.floor(t / 32);
  }
  const rand = randomBytes(16);
  let out = "";
  for (let i = 0; i < 16; i++) out += CROCKFORD[rand[i] % 32];
  return ts + out;
}

const NANO_ALPHABET = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

export function nanoid(size = 21): string {
  const bytes = randomBytes(size);
  return Array.from(bytes, (b) => NANO_ALPHABET[b & 63]).join("");
}

/* ----------------------------------- JSON ----------------------------------- */

export function formatJson(input: string, indent = 2): string {
  return JSON.stringify(JSON.parse(input), null, indent);
}

export function minifyJson(input: string): string {
  return JSON.stringify(JSON.parse(input));
}

export function sortJsonKeys(input: string): string {
  const sort = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sort);
    if (value && typeof value === "object") {
      return Object.keys(value as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = sort((value as Record<string, unknown>)[key]);
          return acc;
        }, {});
    }
    return value;
  };
  return JSON.stringify(sort(JSON.parse(input)), null, 2);
}

/** Structural summary of a JSON document, e.g. { users: Array<{ id: number }> } */
export function describeJson(input: string): string {
  const typeOf = (v: unknown): string => {
    if (v === null) return "null";
    if (Array.isArray(v)) return v.length === 0 ? "unknown[]" : `Array<${typeOf(v[0])}>`;
    if (typeof v === "object") {
      const entries = Object.entries(v as Record<string, unknown>).slice(0, 12);
      return `{ ${entries.map(([k, val]) => `${k}: ${typeOf(val)}`).join(", ")}${entries.length < Object.keys(v as object).length ? ", ..." : ""} }`;
    }
    return typeof v;
  };
  return typeOf(JSON.parse(input));
}

export function jsonToTypeScript(input: string, rootName = "Root"): string {
  const value = JSON.parse(input);
  const interfaces: string[] = [];
  const seen = new Set<string>();

  const pascal = (s: string) => {
    const cleaned = s
      .replace(/[^a-zA-Z0-9]+(.)?/g, (_, c: string) => (c ? c.toUpperCase() : ""))
      .replace(/^./, (c) => c.toUpperCase());
    return cleaned || "Value";
  };

  const typeOf = (v: unknown, name: string): string => {
    if (v === null) return "null";
    if (Array.isArray(v)) return v.length === 0 ? "unknown[]" : `${typeOf(v[0], singular(name))}[]`;
    switch (typeof v) {
      case "string":
        return "string";
      case "number":
        return "number";
      case "boolean":
        return "boolean";
      case "object": {
        const ifaceName = pascal(name);
        if (!seen.has(ifaceName)) {
          seen.add(ifaceName);
          interfaces.push(renderInterface(ifaceName, v as Record<string, unknown>));
        }
        return ifaceName;
      }
      default:
        return "unknown";
    }
  };

  const renderInterface = (name: string, obj: Record<string, unknown>): string => {
    const body = Object.entries(obj)
      .map(([k, v]) => {
        const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
        return `  ${safeKey}${v === null ? "?" : ""}: ${typeOf(v, k)};`;
      })
      .join("\n");
    return `export interface ${name} {\n${body}\n}`;
  };

  const rootType = typeOf(value, rootName);
  const blocks = [...interfaces.reverse()];
  if (rootType !== pascal(rootName)) blocks.push(`export type ${pascal(rootName)} = ${rootType};`);
  return blocks.join("\n\n");
}

function singular(name: string): string {
  return name.endsWith("ies") ? `${name.slice(0, -3)}y` : name.endsWith("s") ? name.slice(0, -1) : name;
}

/* ----------------------------------- JWT ----------------------------------- */

export interface JwtParts {
  header: unknown;
  payload: Record<string, unknown>;
  signature: string;
  expired: boolean | null;
  expiresAt: Date | null;
  issuedAt: Date | null;
  notBefore: Date | null;
}

export function decodeJwt(token: string): JwtParts {
  const parts = token
    .trim()
    .replace(/^Bearer\s+/i, "")
    .split(".");
  if (parts.length < 2) throw new Error("Invalid JWT: expected at least a header and a payload segment");
  const decodeSegment = (segment: string) => JSON.parse(base64Decode(segment)) as unknown;

  const header = decodeSegment(parts[0]);
  const payload = decodeSegment(parts[1]) as Record<string, unknown>;
  const toDate = (v: unknown) => (typeof v === "number" ? new Date(v * 1000) : null);
  const expiresAt = toDate(payload.exp);

  return {
    header,
    payload,
    signature: parts[2] ?? "",
    expired: expiresAt ? expiresAt.getTime() < Date.now() : null,
    expiresAt,
    issuedAt: toDate(payload.iat),
    notBefore: toDate(payload.nbf),
  };
}

/* -------------------------------- Radix convert -------------------------------- */

const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";

export function convertRadix(input: string, from: number, to: number): string {
  const raw = input
    .trim()
    .toLowerCase()
    .replace(/^0[bxo]/, "")
    .replace(/[\s_]/g, "");
  if (!raw) return "";
  const value = parseBigInt(raw, from);
  const negative = value < 0n;
  const text = (negative ? -value : value).toString(to);
  return negative ? `-${text}` : text;
}

function parseBigInt(raw: string, radix: number): bigint {
  const negative = raw.startsWith("-");
  const body = negative ? raw.slice(1) : raw;
  if (!body) throw new Error("No digits to convert");
  let result = 0n;
  const base = BigInt(radix);
  for (const ch of body) {
    const idx = DIGITS.indexOf(ch);
    if (idx === -1 || idx >= radix) throw new Error(`Invalid digit "${ch}" for base ${radix}`);
    result = result * base + BigInt(idx);
  }
  return negative ? -result : result;
}

export const RADIX_LABELS: Record<number, string> = {
  2: "Binary (base 2)",
  8: "Octal (base 8)",
  10: "Decimal (base 10)",
  16: "Hexadecimal (base 16)",
  32: "Base32",
  36: "Base36",
};

export function radixTable(input: string, from: number): Array<{ radix: number; label: string; value: string }> {
  return Object.keys(RADIX_LABELS).map((key) => {
    const radix = Number(key);
    return { radix, label: RADIX_LABELS[radix], value: convertRadix(input, from, radix) };
  });
}

/* ---------------------------------- IP / CIDR ---------------------------------- */

export function ipToLong(ip: string): number {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) throw new Error("Invalid IPv4 address");
  return (
    parts.reduce((acc, part) => {
      const n = Number(part);
      if (!Number.isInteger(n) || n < 0 || n > 255) throw new Error(`Invalid IPv4 octet: ${part}`);
      return (acc << 8) + n;
    }, 0) >>> 0
  );
}

export function longToIp(long: number): string {
  return [24, 16, 8, 0].map((shift) => (long >>> shift) & 0xff).join(".");
}

export function ipToBinary(ip: string): string {
  return ipToLong(ip)
    .toString(2)
    .padStart(32, "0")
    .replace(/(.{8})(?=.)/g, "$1.");
}

export function isPrivateIp(ip: string): boolean {
  const long = ipToLong(ip);
  const ranges: Array<[string, number]> = [
    ["10.0.0.0", 8],
    ["172.16.0.0", 12],
    ["192.168.0.0", 16],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["100.64.0.0", 10],
    ["0.0.0.0", 8],
    ["224.0.0.0", 4],
  ];
  return ranges.some(([base, prefix]) => {
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (long & mask) >>> 0 === (ipToLong(base) & mask) >>> 0;
  });
}

export interface CidrInfo {
  network: string;
  broadcast: string;
  netmask: string;
  wildcard: string;
  firstHost: string;
  lastHost: string;
  totalHosts: number;
  usableHosts: number;
  prefix: number;
}

export function analyzeCidr(cidr: string): CidrInfo {
  const [ip, prefixRaw] = cidr.trim().split("/");
  const prefix = Number(prefixRaw ?? 32);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new Error("Prefix length must be between 0 and 32");

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const ipLong = ipToLong(ip || "0.0.0.0");
  const network = (ipLong & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const total = 2 ** (32 - prefix);

  return {
    network: `${longToIp(network)}/${prefix}`,
    broadcast: longToIp(broadcast),
    netmask: longToIp(mask),
    wildcard: longToIp(~mask >>> 0),
    firstHost: longToIp(prefix >= 31 ? network : network + 1),
    lastHost: longToIp(prefix >= 31 ? broadcast : broadcast - 1),
    totalHosts: total,
    usableHosts: prefix >= 31 ? total : total - 2,
    prefix,
  };
}

/* ---------------------------------- Cron ---------------------------------- */

const CRON_MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const CRON_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const CRON_RANGES: Array<[number, number]> = [
  [0, 59],
  [0, 23],
  [1, 31],
  [1, 12],
  [0, 6],
];

function parseCronField(field: string, min: number, max: number): number[] {
  if (field === "*" || field === "?") {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }
  const result = new Set<number>();
  for (const part of field.split(",")) {
    if (!part) continue;
    const [rangePart, stepPart] = part.split("/");
    const step = stepPart ? Number(stepPart) : 1;
    if (!Number.isInteger(step) || step < 1) throw new Error(`Invalid step: ${part}`);
    let start = min;
    let end = max;
    if (rangePart !== "*" && rangePart !== "") {
      const [a, b] = rangePart.split("-");
      start = Number(a);
      end = b === undefined ? (stepPart ? max : Number(a)) : Number(b);
      if (Number.isNaN(start) || Number.isNaN(end)) throw new Error(`Invalid field: ${field}`);
    }
    for (let v = start; v <= end; v += step) {
      if (v < min || v > max) throw new Error(`Value ${v} is outside the range ${min}-${max}`);
      result.add(v);
    }
  }
  return [...result].sort((a, b) => a - b);
}

export function parseCron(expression: string): number[][] {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error("Only standard 5-field cron is supported: minute hour day month weekday");
  const normalizeNames = (field: string, names: string[]) => {
    let out = field.toUpperCase();
    names.forEach((name, idx) => (out = out.replace(new RegExp(name, "g"), String(idx))));
    return out;
  };
  const normalized = [
    parts[0],
    parts[1],
    parts[2],
    normalizeNames(parts[3], CRON_MONTHS),
    normalizeNames(parts[4], CRON_DAYS),
  ];
  return normalized.map((field, idx) => parseCronField(field, CRON_RANGES[idx][0], CRON_RANGES[idx][1]));
}

export function nextCronRuns(expression: string, count = 10, from: Date = new Date()): Date[] {
  const [minutes, hours, days, months, weekdays] = parseCron(expression);
  // In five-field cron, restricting both day-of-month and day-of-week means "either", not
  // "both": `0 0 1 * 1` fires on the 1st of every month *and* on every Monday. The plain
  // AND only applies when at least one of the two fields is `*`. Vixie cron decides this
  // from the *first character* of the field alone, so a stepped wildcard such as `*/2`
  // still counts as `*` and stays on the AND path (cronie entry.c sets DOM_STAR/DOW_STAR
  // from the first character; cron.c then picks AND when either flag is set).
  const fields = expression.trim().split(/\s+/);
  const isUnrestrictedDay = (field: string) => field.startsWith("*") || field === "?";
  const bothRestricted = fields.length === 5 && !isUnrestrictedDay(fields[2]) && !isUnrestrictedDay(fields[4]);
  const results: Date[] = [];
  const cursor = new Date(from.getTime());
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);
  const limit = new Date(from.getTime() + 5 * 366 * 24 * 60 * 60 * 1000);

  while (results.length < count && cursor <= limit) {
    const dayMatch = days.includes(cursor.getDate());
    const weekdayMatch = weekdays.includes(cursor.getDay());
    if (
      minutes.includes(cursor.getMinutes()) &&
      hours.includes(cursor.getHours()) &&
      months.includes(cursor.getMonth() + 1) &&
      (bothRestricted ? dayMatch || weekdayMatch : dayMatch && weekdayMatch)
    ) {
      results.push(new Date(cursor.getTime()));
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return results;
}

export function describeCron(expression: string): string {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return "Invalid expression";
  const [minute, hour, day, month, weekday] = parts;
  const pieces: string[] = [];
  if (minute === "*") pieces.push("every minute");
  else if (minute.includes("/")) pieces.push(`every ${minute.split("/")[1]} minutes`);
  else pieces.push(`at minute ${minute}`);
  if (hour === "*") pieces.push("every hour");
  else if (hour.includes("/")) pieces.push(`every ${hour.split("/")[1]} hours`);
  else pieces.push(`at hour ${hour}`);
  if (day !== "*") pieces.push(`on day-of-month ${day}`);
  if (month !== "*") pieces.push(`in month ${month}`);
  if (weekday !== "*") pieces.push(`on weekday ${weekday}`);
  return pieces.join(" · ");
}

/* ---------------------------------- Diff ---------------------------------- */

export interface DiffLine {
  type: "same" | "add" | "remove";
  value: string;
  leftNumber?: number;
  rightNumber?: number;
}

/** Cap on the LCS table size, in cells, so two huge inputs cannot exhaust memory. */
const DIFF_CELL_LIMIT = 4_000_000;

/** Line-by-line diff based on the longest common subsequence */
export function diffLines(left: string, right: string, ignoreCase = false, ignoreWhitespace = false): DiffLine[] {
  const normalize = (line: string) => {
    let out = line;
    if (ignoreWhitespace) out = out.replace(/\s+/g, " ").trim();
    if (ignoreCase) out = out.toLowerCase();
    return out;
  };

  const a = left.split("\n");
  const b = right.split("\n");
  const na = a.map(normalize);
  const nb = b.map(normalize);

  // Peel off the shared prefix and suffix before building the LCS table. Those lines are
  // equal by definition, so this is exact, and it keeps the table small for the usual case
  // of two large files that differ in only a few places.
  let head = 0;
  while (head < a.length && head < b.length && na[head] === nb[head]) head++;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && na[a.length - 1 - tail] === nb[b.length - 1 - tail]) {
    tail++;
  }

  const midA = a.slice(head, a.length - tail);
  const midB = b.slice(head, b.length - tail);
  if ((midA.length + 1) * (midB.length + 1) > DIFF_CELL_LIMIT) {
    throw new Error(`Too much text to diff (${a.length} vs ${b.length} lines). Compare smaller sections instead.`);
  }

  const dp: number[][] = Array.from({ length: midA.length + 1 }, () => new Array(midB.length + 1).fill(0));
  for (let i = midA.length - 1; i >= 0; i--) {
    for (let j = midB.length - 1; j >= 0; j--) {
      dp[i][j] = na[head + i] === nb[head + j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const result: DiffLine[] = [];
  let leftNo = 1;
  let rightNo = 1;
  for (let k = 0; k < head; k++) {
    result.push({ type: "same", value: a[k], leftNumber: leftNo++, rightNumber: rightNo++ });
  }

  let i = 0;
  let j = 0;
  while (i < midA.length && j < midB.length) {
    if (na[head + i] === nb[head + j]) {
      result.push({ type: "same", value: midA[i], leftNumber: leftNo++, rightNumber: rightNo++ });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: "remove", value: midA[i], leftNumber: leftNo++ });
      i++;
    } else {
      result.push({ type: "add", value: midB[j], rightNumber: rightNo++ });
      j++;
    }
  }
  while (i < midA.length) {
    result.push({ type: "remove", value: midA[i], leftNumber: leftNo++ });
    i++;
  }
  while (j < midB.length) {
    result.push({ type: "add", value: midB[j], rightNumber: rightNo++ });
    j++;
  }
  for (let k = 0; k < tail; k++) {
    result.push({ type: "same", value: a[a.length - tail + k], leftNumber: leftNo++, rightNumber: rightNo++ });
  }
  return result;
}

export function diffStats(lines: DiffLine[]) {
  const added = lines.filter((l) => l.type === "add").length;
  const removed = lines.filter((l) => l.type === "remove").length;
  return { added, removed, unchanged: lines.length - added - removed };
}

/* ------------------------------ Random / Password ------------------------------ */

export interface PasswordOptions {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

export function generatePassword(options: PasswordOptions): string {
  const sets: string[] = [];
  if (options.lowercase) sets.push("abcdefghijklmnopqrstuvwxyz");
  if (options.uppercase) sets.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  if (options.digits) sets.push("0123456789");
  if (options.symbols) sets.push("!@#$%^&*()-_=+[]{};:,.?/");
  if (sets.length === 0) throw new Error("Select at least one character set");

  const ambiguous = "Il1O0o";
  const pool = sets
    .join("")
    .split("")
    .filter((c) => !options.excludeAmbiguous || !ambiguous.includes(c))
    .join("");
  if (!pool) throw new Error("No usable characters left");

  const length = Math.max(4, Math.min(256, options.length));
  const chars = randomInts(length, pool.length).map((i) => pool[i]);

  // Guarantee one character from every selected set. Choosing a slot per set independently
  // lets two sets land on the same index and overwrite each other, which silently drops a
  // required character class — and happens often for short passwords. Reserve distinct
  // slots instead: "length" is at least 4 and there are at most 4 sets, so there are always
  // enough of them.
  const required = sets.map((set) => set.split("").filter((c) => pool.includes(c))).filter((set) => set.length > 0);
  const slots = shuffled([...Array(length).keys()]).slice(0, required.length);
  required.forEach((set, idx) => {
    chars[slots[idx]] = set[randomInts(1, set.length)[0]];
  });
  return chars.join("");
}

/** Fisher-Yates shuffle driven by crypto randomness */
function shuffled<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = cryptoRandomInt(0, i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function randomInts(count: number, maxExclusive: number): number[] {
  return Array.from({ length: count }, () => cryptoRandomInt(0, maxExclusive));
}

export function randomInt(min: number, max: number): number {
  return cryptoRandomInt(min, max + 1);
}

export function passwordStrength(password: string): { score: number; label: string; entropy: number } {
  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 33;
  const entropy = poolSize > 0 ? password.length * Math.log2(poolSize) : 0;
  const score = Math.min(100, Math.round((entropy / 128) * 100));
  const label =
    entropy >= 128
      ? "Very strong"
      : entropy >= 90
        ? "Strong"
        : entropy >= 60
          ? "Medium"
          : entropy >= 36
            ? "Weak"
            : "Very weak";
  return { score, label, entropy: Math.round(entropy * 10) / 10 };
}

/* ------------------------------- Case convert ------------------------------- */

export function splitWords(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

export type CaseStyle = "camel" | "pascal" | "snake" | "screamingSnake" | "kebab" | "dot" | "title" | "sentence";

export const CASE_LABELS: Record<CaseStyle, string> = {
  camel: "camelCase",
  pascal: "PascalCase",
  snake: "snake_case",
  screamingSnake: "SCREAMING_SNAKE_CASE",
  kebab: "kebab-case",
  dot: "dot.case",
  title: "Title Case",
  sentence: "Sentence case",
};

export function convertCase(input: string, style: CaseStyle): string {
  const words = splitWords(input);
  switch (style) {
    case "camel":
      return words.map((w, i) => (i === 0 ? w : capitalize(w))).join("");
    case "pascal":
      return words.map(capitalize).join("");
    case "snake":
      return words.join("_");
    case "screamingSnake":
      return words.join("_").toUpperCase();
    case "kebab":
      return words.join("-");
    case "dot":
      return words.join(".");
    case "title":
      return words.map(capitalize).join(" ");
    case "sentence":
      return capitalize(words.join(" "));
  }
}

export function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/* --------------------------------- Color --------------------------------- */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb {
  const clean = hex.trim().replace(/^#/, "").toLowerCase();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  if (!/^[0-9a-f]{6}$/.test(full)) throw new Error("Invalid HEX color");
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b]
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

export function parseRgbString(input: string): Rgb | null {
  const match = input.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!match) return null;
  const [r, g, b] = [Number(match[1]), Number(match[2]), Number(match[3])];
  // Reject out-of-range channels rather than accepting them: rgbToHex clamps to 255 while the
  // HSL, CMYK and contrast rows use the raw numbers, so "rgb(300,0,0)" would describe two
  // different colours in the same list.
  if (r > 255 || g > 255 || b > 255) return null;
  return { r, g, b };
}

export function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb({ h, s, l }: { h: number; s: number; l: number }): Rgb {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let rgb: [number, number, number] = [0, 0, 0];
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const m = ln - c / 2;
  return {
    r: Math.round((rgb[0] + m) * 255),
    g: Math.round((rgb[1] + m) * 255),
    b: Math.round((rgb[2] + m) * 255),
  };
}

export function rgbToCmyk({ r, g, b }: Rgb): { c: number; m: number; y: number; k: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: Math.round(((1 - rn - k) / (1 - k)) * 100),
    m: Math.round(((1 - gn - k) / (1 - k)) * 100),
    y: Math.round(((1 - bn - k) / (1 - k)) * 100),
    k: Math.round(k * 100),
  };
}

export function parseColor(input: string): Rgb {
  const raw = input.trim();
  if (/^#?[0-9a-fA-F]{3,8}$/.test(raw)) return hexToRgb(raw);
  const rgb = parseRgbString(raw);
  if (rgb) return rgb;
  const hslMatch = raw.match(/hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%/i);
  if (hslMatch) return hslToRgb({ h: Number(hslMatch[1]), s: Number(hslMatch[2]), l: Number(hslMatch[3]) });
  throw new Error("Unrecognized color format. Supported: HEX, RGB, HSL");
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const channel = (v: number) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };
  const lum = ({ r, g, b }: Rgb) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const l1 = lum(a);
  const l2 = lum(b);
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100;
}

/* ------------------------------- Text toolkit ------------------------------- */

export function textStats(input: string) {
  const chars = [...input];
  const lines = input.split("\n");
  return {
    chars: chars.length,
    charsNoSpace: input.replace(/\s/g, "").length,
    words: input.split(/\s+/).filter(Boolean).length,
    lines: lines.length,
    nonEmptyLines: lines.filter((l) => l.trim()).length,
    cjk: chars.filter((c) => /[\u4e00-\u9fa5]/.test(c)).length,
    bytes: Buffer.byteLength(input, "utf8"),
  };
}

export function dedupeLines(input: string, caseSensitive = true): string {
  const seen = new Set<string>();
  return input
    .split("\n")
    .filter((line) => {
      const key = caseSensitive ? line : line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join("\n");
}

export function removeEmptyLines(input: string): string {
  return input
    .split("\n")
    .filter((line) => line.trim())
    .join("\n");
}

export function trimLines(input: string): string {
  return input
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
}

export function sortLines(input: string, descending = false): string {
  return input
    .split("\n")
    .sort((a, b) => (descending ? b.localeCompare(a) : a.localeCompare(b)))
    .join("\n");
}

export function reverseText(input: string): string {
  return [...input].reverse().join("");
}
