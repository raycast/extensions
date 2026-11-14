import { parseOtpAuthUri } from "../otp";
import { parseGoogleAuthMigration } from "../google-auth-migration";
import type { NewAccountInput, VaultGroup } from "../types";
import { isBase32Secret, normalizeGroups, normalizeAccounts } from "./normalization";
import { parseJsonAccounts } from "./json-import";

// ---- Main import parser ----

export function parseImportDataUnchecked(text: string): NewAccountInput[] | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // 1. Google Authenticator migration URI
  if (trimmed.startsWith("otpauth-migration://")) {
    const entries = parseGoogleAuthMigration(trimmed);
    if (entries && entries.length > 0) return entries;
  }

  // 2. Single or multi-line otpauth:// URIs
  if (trimmed.startsWith("otpauth://")) {
    const lines = trimmed.split(/[\n\r]+/).map((l) => l.trim()).filter(Boolean);
    const parsed: NewAccountInput[] = [];
    for (const line of lines) {
      if (line.startsWith("otpauth-migration://")) {
        const migrated = parseGoogleAuthMigration(line);
        if (migrated) parsed.push(...migrated);
      } else if (line.startsWith("otpauth://")) {
        const p = parseOtpAuthUri(line);
        if (p) parsed.push({ ...p });
      }
    }
    if (parsed.length > 0) return parsed;
  }

  // 3. JSON formats
  const jsonAccounts = parseJsonAccounts(trimmed);
  if (jsonAccounts) return jsonAccounts;

  // 4. Mixed text: lines that are otpauth:// URIs or otpauth-migration:// URIs
  const lines = trimmed.split(/[\n\r]+/).map((l) => l.trim()).filter(Boolean);
  const fromUris: NewAccountInput[] = [];
  for (const line of lines) {
    if (line.startsWith("otpauth-migration://")) {
      const migrated = parseGoogleAuthMigration(line);
      if (migrated) fromUris.push(...migrated);
    } else if (line.startsWith("otpauth://")) {
      const p = parseOtpAuthUri(line);
      if (p) fromUris.push({ ...p });
    }
  }
  if (fromUris.length > 0) return fromUris;

  // 5. Single base32 secret (one per line)
  const base32Lines = lines.filter((l) => isBase32Secret(l));
  if (base32Lines.length > 0) {
    return base32Lines.map((s, i) => ({
      name: `Account ${i + 1}`,
      issuer: "",
      secret: s.replace(/[\s-]/g, "").toUpperCase(),
      type: "totp" as const,
      digits: 6,
      period: 30,
      counter: 0,
      algorithm: "SHA-1" as const,
    }));
  }

  return null;
}

export interface ImportBundle {
  accounts: NewAccountInput[];
  groups: VaultGroup[];
}

export function parseImportData(text: string): NewAccountInput[] | null {
  const parsed = parseImportDataUnchecked(text);
  if (!parsed) return null;
  const normalized = normalizeAccounts(parsed);
  return normalized.length > 0 ? normalized : null;
}

export function parseImportBundle(text: string): ImportBundle | null {
  const trimmed = text.trim();
  try {
    const json = JSON.parse(trimmed) as Record<string, unknown>;
    if (json && json.app === "goose-2fa" && Array.isArray(json.accounts)) {
      const accounts = normalizeAccounts(json.accounts);
      if (accounts.length === 0) return null;
      return { accounts, groups: normalizeGroups(json.groups) };
    }
  } catch {
    // 其他支持格式由统一解析器处理。
  }
  const accounts = parseImportData(trimmed);
  return accounts ? { accounts, groups: [] } : null;
}
