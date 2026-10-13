import type { AccountData, NewAccountInput } from "./types";

const BASE32_RE = /^[A-Z2-7]+$/;
const ALGORITHMS = new Set<AccountData["algorithm"]>(["SHA-1", "SHA-256", "SHA-512"]);

export function normalizeBase32Secret(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/[\s-]/g, "").replace(/=+$/, "").toUpperCase();
  if (normalized.length < 8 || normalized.length > 256 || !BASE32_RE.test(normalized)) {
    return null;
  }
  return normalized;
}

function optionalText(value: unknown, maxLength = 2000): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : undefined;
}

function finiteInteger(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) ? parsed : Number.NaN;
}

export function normalizeNewAccountInput(value: unknown): NewAccountInput | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const secret = normalizeBase32Secret(raw.secret);
  if (!secret) return null;

  const typeRaw = typeof raw.type === "string" ? raw.type.toLowerCase() : "totp";
  if (typeRaw !== "totp" && typeRaw !== "hotp") return null;
  const type = typeRaw;
  const digits = finiteInteger(raw.digits, 6);
  const period = finiteInteger(raw.period, 30);
  const counter = finiteInteger(raw.counter, 0);
  if ((digits !== 6 && digits !== 8) || period < 1 || period > 300 || counter < 0) {
    return null;
  }

  const algorithmRaw = typeof raw.algorithm === "string"
    ? raw.algorithm.toUpperCase().replace(/^SHA(?=\d)/, "SHA-")
    : "SHA-1";
  if (!ALGORITHMS.has(algorithmRaw as AccountData["algorithm"])) return null;

  const issuer = typeof raw.issuer === "string" ? raw.issuer.trim().slice(0, 200) : "";
  const rawName = typeof raw.name === "string" ? raw.name.trim() : "";
  const name = (rawName || issuer || "Unknown").slice(0, 300);

  return {
    name,
    issuer,
    secret,
    type,
    digits,
    period,
    counter,
    algorithm: algorithmRaw as AccountData["algorithm"],
    originalName: optionalText(raw.originalName, 500),
    note: optionalText(raw.note, 500),
    remark: optionalText(raw.remark),
    groupId: typeof raw.groupId === "string" && raw.groupId ? raw.groupId : null,
  };
}

export function normalizeStoredAccount(value: unknown, validGroupIds?: Set<string>): AccountData | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const input = normalizeNewAccountInput(raw);
  if (!input) return null;
  const id = typeof raw.id === "string" && raw.id ? raw.id : crypto.randomUUID();
  const createdAt = typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
    ? raw.createdAt
    : Date.now();
  const groupId = input.groupId && (!validGroupIds || validGroupIds.has(input.groupId))
    ? input.groupId
    : null;
  const deletedAt = typeof raw.deletedAt === "number" && Number.isFinite(raw.deletedAt)
    ? raw.deletedAt
    : undefined;
  return { ...input, id, createdAt, groupId, deletedAt };
}

export function normalizeStoredAccounts(values: unknown, validGroupIds?: Set<string>): AccountData[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => normalizeStoredAccount(value, validGroupIds))
    .filter((account): account is AccountData => account !== null);
}
