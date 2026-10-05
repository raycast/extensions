import { parseOtpAuthUri } from "./otp";
import { parseGoogleAuthMigration } from "./google-auth-migration";
import { normalizeBase32Secret, normalizeNewAccountInput, normalizeStoredAccounts } from "./account-validation";
import type { AccountData, NewAccountInput, VaultGroup } from "./types";

export interface ExportPayload {
  version: 2;
  app: "goose-2fa";
  exported_at: string;
  groups: VaultGroup[];
  accounts: NewAccountInput[];
}

export interface SyncExportPayload {
  version: 2;
  app: "goose-2fa";
  exported_at: string;
  groups: VaultGroup[];
  accounts: AccountData[];
  trash: AccountData[];
}

// ---- Export ----

export function exportAsJson(accounts: AccountData[], groups: VaultGroup[] = []): string {
  const payload: ExportPayload = {
    version: 2,
    app: "goose-2fa",
    exported_at: new Date().toISOString(),
    groups: groups.map(({ id, name, order, createdAt }) => ({ id, name, order, createdAt })),
    accounts: accounts.map(({ id: _id, createdAt: _createdAt, meta: _meta, deletedAt: _deletedAt, ...rest }) => rest),
  };
  return JSON.stringify(payload, null, 2);
}

/** 自动同步备份保留稳定 id、时间戳和回收站，仍可被手动导入读取。 */
export function exportAsSyncJson(
  accounts: AccountData[],
  groups: VaultGroup[] = [],
  trash: AccountData[] = [],
): string {
  const payload: SyncExportPayload = {
    version: 2,
    app: "goose-2fa",
    exported_at: new Date().toISOString(),
    groups: groups.map((group) => ({ ...group })),
    accounts: accounts.map((account) => ({ ...account })),
    trash: trash.map((account) => ({ ...account })),
  };
  return JSON.stringify(payload, null, 2);
}

export interface SyncSnapshot {
  accounts: AccountData[];
  groups: VaultGroup[];
  trash: AccountData[];
}

function hasStableId(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const id = (item as Record<string, unknown>).id;
  return typeof id === "string" && id !== "";
}

/**
 * 严格解析自动同步文件（数据源）：保留 id/createdAt/deletedAt 与回收站。
 * 头部不符、任一条目缺少稳定 id 或无法解析时返回 null —— 调用方必须按「文件无效」处理，
 * 不能当成空库，也不能把解析结果写回文件。
 */
export function parseSyncSnapshot(text: string): SyncSnapshot | null {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const raw = json as Record<string, unknown>;
  if (raw.app !== "goose-2fa" || !Array.isArray(raw.accounts)) return null;
  const accountsRaw = raw.accounts as unknown[];
  const trashRaw = Array.isArray(raw.trash) ? (raw.trash as unknown[]) : [];
  if (!accountsRaw.every(hasStableId) || !trashRaw.every(hasStableId)) return null;
  // id 同时是界面 key 与更新/删除主键，重复 id 会让一次编辑命中多条记录。
  const ids = [...accountsRaw, ...trashRaw].map((item) => (item as { id: string }).id);
  if (new Set(ids).size !== ids.length) return null;
  const groups = normalizeGroups(raw.groups);
  const validGroupIds = new Set(groups.map((group) => group.id));
  const accounts = normalizeStoredAccounts(accountsRaw, validGroupIds);
  const trash = normalizeStoredAccounts(trashRaw, validGroupIds);
  if (accounts.length !== accountsRaw.length || trash.length !== trashRaw.length) return null;
  return { accounts, groups, trash };
}

export function exportAsUris(accounts: AccountData[]): string {
  return accounts
    .map((a) => {
      const label = a.issuer
        ? `${encodeURIComponent(a.issuer)}:${encodeURIComponent(a.name)}`
        : encodeURIComponent(a.name);
      const params = new URLSearchParams();
      params.set("secret", a.secret);
      if (a.issuer) params.set("issuer", a.issuer);
      params.set("algorithm", a.algorithm.replace("-", ""));
      params.set("digits", String(a.digits));
      if (a.type === "totp") params.set("period", String(a.period));
      if (a.type === "hotp") params.set("counter", String(a.counter));
      return `otpauth://${a.type}/${label}?${params.toString()}`;
    })
    .join("\n");
}

// ---- Algorithm normalization ----

const ALGORITHM_MAP: Record<string, "SHA-1" | "SHA-256" | "SHA-512"> = {
  SHA1: "SHA-1",
  "SHA-1": "SHA-1",
  "sha-1": "SHA-1",
  sha1: "SHA-1",
  SHA256: "SHA-256",
  "SHA-256": "SHA-256",
  sha256: "SHA-256",
  "sha-256": "SHA-256",
  SHA512: "SHA-512",
  "SHA-512": "SHA-512",
  sha512: "SHA-512",
  "sha-512": "SHA-512",
};

function normalizeAlgorithm(alg: string | undefined | null): "SHA-1" | "SHA-256" | "SHA-512" {
  if (!alg) return "SHA-1";
  return ALGORITHM_MAP[alg.trim()] ?? "SHA-1";
}

function normalizeType(t: string | undefined | null): "totp" | "hotp" {
  if (!t) return "totp";
  return t.toLowerCase() === "hotp" ? "hotp" : "totp";
}

// ---- Base32 detection ----

export function isBase32Secret(text: string): boolean {
  return normalizeBase32Secret(text) !== null;
}

// ---- Format parsers ----

/** Our own goose-2fa backup */
function tryGoose2fa(json: Record<string, unknown>): NewAccountInput[] | null {
  if (json.app === "goose-2fa" && Array.isArray(json.accounts)) {
    return parseAccountArray(json.accounts);
  }
  return null;
}

/** 2FAS Authenticator backup: { "services": [...], "updatedAt": ..., "schemaVersion": ... } */
function try2FAS(json: Record<string, unknown>): NewAccountInput[] | null {
  if (!Array.isArray(json.services)) return null;
  const results: NewAccountInput[] = [];
  for (const svc of json.services as Record<string, unknown>[]) {
    const otp = svc.otp as Record<string, unknown> | undefined;
    const secret = (otp?.secret ?? svc.secret) as string | undefined;
    if (!secret) continue;

    results.push({
      name: ((otp?.account ?? otp?.label ?? svc.name ?? "Unknown") as string),
      issuer: ((otp?.issuer ?? svc.name ?? "") as string),
      secret: String(secret).replace(/\s/g, "").toUpperCase(),
      type: normalizeType((otp?.tokenType ?? otp?.type ?? "TOTP") as string),
      digits: parseInt(String(otp?.digits ?? 6)) || 6,
      period: parseInt(String(otp?.period ?? 30)) || 30,
      counter: parseInt(String(otp?.counter ?? 0)) || 0,
      algorithm: normalizeAlgorithm((otp?.algorithm ?? "SHA1") as string),
    });
  }
  return results.length > 0 ? results : null;
}

/** Aegis Authenticator backup: { "version": N, "db": { "entries": [...] } } */
function tryAegis(json: Record<string, unknown>): NewAccountInput[] | null {
  const db = json.db as Record<string, unknown> | undefined;
  if (!db || !Array.isArray(db.entries)) return null;
  const results: NewAccountInput[] = [];
  for (const entry of db.entries as Record<string, unknown>[]) {
    const info = entry.info as Record<string, unknown> | undefined;
    const secret = (info?.secret ?? entry.secret) as string | undefined;
    if (!secret) continue;

    results.push({
      name: (entry.name as string) || "Unknown",
      issuer: (entry.issuer as string) || "",
      secret: String(secret).replace(/\s/g, "").toUpperCase(),
      type: normalizeType((entry.type ?? "totp") as string),
      digits: parseInt(String(info?.digits ?? 6)) || 6,
      period: parseInt(String(info?.period ?? 30)) || 30,
      counter: parseInt(String(info?.counter ?? 0)) || 0,
      algorithm: normalizeAlgorithm((info?.algo ?? info?.algorithm ?? "SHA1") as string),
    });
  }
  return results.length > 0 ? results : null;
}

/** andOTP backup: plain JSON array with { secret, issuer, label, type, algorithm, digits, period } */
function tryAndOTP(arr: unknown[]): NewAccountInput[] | null {
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
function tryRaivo(arr: unknown[]): NewAccountInput[] | null {
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
function tryFreeOTP(arr: unknown[]): NewAccountInput[] | null {
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

/** Generic fallback: any JSON array or object with accounts that have a "secret" field */
function parseAccountArray(arr: unknown[]): NewAccountInput[] {
  const results: NewAccountInput[] = [];
  for (const a of arr as Record<string, unknown>[]) {
    const secret = a.secret as string | undefined;
    if (!secret) continue;

    let name = ((a.name ?? a.label ?? a.account ?? "") as string);
    let issuer = ((a.issuer ?? a.issuerExt ?? "") as string);

    if (!issuer && name.includes(":")) {
      const idx = name.indexOf(":");
      issuer = name.slice(0, idx).trim();
      name = name.slice(idx + 1).trim();
    }

    results.push({
      name: name || issuer || "Unknown",
      issuer,
      secret: String(secret).replace(/\s/g, "").toUpperCase(),
      type: normalizeType((a.type ?? a.tokenType ?? a.kind ?? "totp") as string),
      digits: parseInt(String(a.digits ?? 6)) || 6,
      period: parseInt(String(a.period ?? a.timer ?? 30)) || 30,
      counter: parseInt(String(a.counter ?? 0)) || 0,
      algorithm: normalizeAlgorithm((a.algorithm ?? a.algo ?? "SHA1") as string),
    });
  }
  return results;
}

// ---- Main import parser ----

function parseImportDataUnchecked(text: string): NewAccountInput[] | null {
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
  try {
    const json = JSON.parse(trimmed);

    if (typeof json === "object" && json !== null && !Array.isArray(json)) {
      // Try named formats in order of specificity
      const obj = json as Record<string, unknown>;
      const goose = tryGoose2fa(obj);
      if (goose && goose.length > 0) return goose;

      const twofas = try2FAS(obj);
      if (twofas && twofas.length > 0) return twofas;

      const aegis = tryAegis(obj);
      if (aegis && aegis.length > 0) return aegis;

      // Object with "accounts" or "entries" array (generic)
      const arr = (obj.accounts ?? obj.entries ?? obj.otp_parameters) as unknown[] | undefined;
      if (Array.isArray(arr)) {
        const generic = parseAccountArray(arr);
        if (generic.length > 0) return generic;
      }
    }

    if (Array.isArray(json) && json.length > 0) {
      // Try array-based formats
      const andotp = tryAndOTP(json);
      if (andotp && andotp.length > 0) return andotp;

      const raivo = tryRaivo(json);
      if (raivo && raivo.length > 0) return raivo;

      const freeotp = tryFreeOTP(json);
      if (freeotp && freeotp.length > 0) return freeotp;

      // Generic array fallback
      const generic = parseAccountArray(json);
      if (generic.length > 0) return generic;
    }
  } catch {
    // not JSON
  }

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

function normalizeGroups(value: unknown): VaultGroup[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const groups: VaultGroup[] = [];
  for (const [index, item] of value.entries()) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const id = typeof raw.id === "string" ? raw.id.trim() : "";
    const name = typeof raw.name === "string" ? raw.name.trim().replace(/\s+/g, " ") : "";
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    groups.push({
      id,
      name: name.slice(0, 20),
      order: Number.isFinite(raw.order) ? Number(raw.order) : index,
      createdAt: Number.isFinite(raw.createdAt) ? Number(raw.createdAt) : Date.now() + index,
    });
  }
  return groups;
}

function normalizeAccounts(values: unknown): NewAccountInput[] {
  if (!Array.isArray(values)) return [];
  return values
    .map(normalizeNewAccountInput)
    .filter((account): account is NewAccountInput => account !== null);
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

// ---- Deduplication ----

export function deduplicateImports(
  incoming: NewAccountInput[],
  existing: AccountData[],
): { newAccounts: NewAccountInput[]; dupeCount: number } {
  const identity = (account: Pick<NewAccountInput, "secret" | "type" | "issuer" | "name">) =>
    [account.type, normalizeBase32Secret(account.secret) ?? account.secret, account.issuer.trim().toLocaleLowerCase(), account.name.trim().toLocaleLowerCase()].join("\u0000");
  const seen = new Set(existing.map(identity));
  const newAccounts: NewAccountInput[] = [];
  for (const account of incoming) {
    const key = identity(account);
    if (seen.has(key)) continue;
    seen.add(key);
    newAccounts.push(account);
  }
  return { newAccounts, dupeCount: incoming.length - newAccounts.length };
}
