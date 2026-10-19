import { z } from 'zod';

export const Algorithm = z.enum(['SHA1', 'SHA256', 'SHA512']);
export type Algorithm = z.infer<typeof Algorithm>;

const MAX_SECRET_LENGTH = 1024;

export function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let encoded = '';
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      encoded += alphabet[(value >>> (bits -= 5)) & 31];
    }
  }
  if (bits > 0) encoded += alphabet[(value << (5 - bits)) & 31];
  return encoded;
}

export function decodeBase32(value: string): Uint8Array {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_SECRET_LENGTH) {
    throw new Error('Invalid Base32 secret');
  }
  const upper = value.toUpperCase();
  const unpadded = upper.replace(/=+$/, '');
  if (!/^[A-Z2-7]+$/.test(unpadded) || !/^[A-Z2-7]+=*$/.test(upper)) {
    throw new Error('Invalid Base32 secret');
  }
  const padding = upper.length - unpadded.length;
  if (padding && (upper.length % 8 !== 0 || padding !== (8 - (unpadded.length % 8)) % 8)) {
    throw new Error('Invalid Base32 secret');
  }
  const bytes: number[] = [];
  let bits = 0;
  let acc = 0;
  for (const char of unpadded) {
    acc = (acc << 5) | 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((acc >>> (bits -= 8)) & 255);
    }
  }
  const decoded = Uint8Array.from(bytes);
  if (decoded.length === 0 || encodeBase32(decoded) !== unpadded) throw new Error('Invalid Base32 secret');
  return decoded;
}

// Setup pages show keys in groups ("abcd efgh") or with hyphens; neither is part of the Base32 alphabet.
export function normalizeSecret(value: string): string {
  const bytes = decodeBase32(typeof value === 'string' ? value.replace(/[\s-]+/g, '') : value);
  return encodeBase32(bytes);
}

const Name = z.string().trim().min(1).max(200);
const Issuer = z
  .string()
  .trim()
  .max(200)
  .transform((value) => value || undefined)
  .optional();
// Zod issues do not report the received value, so a missing key is told apart here for describeIssue.
const Secret = z
  .string({ error: (issue) => (issue.input === undefined ? 'Missing secret key' : 'Invalid secret key') })
  .transform(normalizeSecret);
const Digits = z.number().int().min(6).max(8);
const Period = z.number().int().min(1).max(300);

export const Account = z.object({
  id: z.string().min(1),
  name: Name,
  issuer: Issuer,
  secret: Secret,
  algorithm: Algorithm.default('SHA1'),
  digits: Digits.default(6),
  period: Period.default(30),
  favorite: z.boolean().default(false),
  lastUsedAt: z.number().int().nonnegative().optional(),
  useCount: z.number().int().nonnegative().default(0),
});
export type Account = z.infer<typeof Account>;

export const CreateAccountSchema = Account.omit({ id: true });
export type CreateAccount = z.input<typeof CreateAccountSchema>;
export type NormalizedCreateAccount = z.output<typeof CreateAccountSchema>;

function decodeLabel(pathname: string): { name: string; issuer?: string } {
  if (!pathname.startsWith('/') || pathname.slice(1).includes('/')) throw new Error('Invalid OTP label');
  let label: string;
  try {
    label = decodeURIComponent(pathname.slice(1));
  } catch {
    throw new Error('Invalid OTP label');
  }
  const colon = label.indexOf(':');
  const issuer = colon >= 0 ? label.slice(0, colon).trim() : undefined;
  const name = (colon >= 0 ? label.slice(colon + 1) : label).trim();
  if (!name) throw new Error('Missing account name');
  if (colon >= 0 && !issuer) throw new Error('Invalid OTP label');
  return { name, issuer };
}

export function parseOtpAuthUri(input: string): NormalizedCreateAccount {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('Invalid OTP URI');
  }
  if (url.protocol === 'otpauth:' && url.hostname.toLowerCase() === 'hotp') throw new Error('HOTP is not supported');
  if (
    url.protocol !== 'otpauth:' ||
    url.hostname.toLowerCase() !== 'totp' ||
    url.username ||
    url.password ||
    url.port ||
    url.hash
  ) {
    throw new Error('Only TOTP URIs are supported');
  }
  const params = new Map<string, string>();
  for (const [rawKey, value] of url.searchParams) {
    const key = rawKey.toLowerCase();
    if (key === 'image') continue;
    const known = ['secret', 'issuer', 'algorithm', 'digits', 'period'].includes(key);
    if (!known || params.has(key)) {
      const shown = rawKey.replace(/[^\w.-]/g, '').slice(0, 24);
      throw new Error(`${known ? 'Duplicate' : 'Unsupported'} OTP parameter: ${shown}`);
    }
    params.set(key, value);
  }
  const label = decodeLabel(url.pathname);
  const queryIssuer = params.get('issuer')?.trim();
  if (params.has('issuer') && !queryIssuer) throw new Error('Invalid OTP issuer');
  if (label.issuer && queryIssuer && label.issuer !== queryIssuer) throw new Error('OTP issuers do not match');
  const algorithm = params.get('algorithm')?.toUpperCase().replace(/-/g, '') ?? 'SHA1';
  const digits = params.has('digits') ? Number(params.get('digits')) : 6;
  const period = params.has('period') ? Number(params.get('period')) : 30;
  if (params.has('digits') && !/^[0-9]+$/.test(params.get('digits')!)) throw new Error('Invalid OTP digits');
  if (params.has('period') && !/^[0-9]+$/.test(params.get('period')!)) throw new Error('Invalid OTP period');
  return CreateAccountSchema.parse({
    name: label.name,
    issuer: queryIssuer || label.issuer,
    secret: params.get('secret'),
    algorithm,
    digits,
    period,
  });
}

export function normalizeAccount(input: unknown): Account {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid account');
  const record = input as Record<string, unknown>;
  if (typeof record.secret === 'string' && record.secret.toLowerCase().startsWith('otpauth:')) {
    const parsed = parseOtpAuthUri(record.secret);
    return Account.parse({ ...record, ...parsed });
  }
  return Account.parse(record);
}

export function exportOtpAuthUri(account: Account): string {
  if (account.issuer?.includes(':') || (!account.issuer && account.name.includes(':'))) {
    throw new Error('A label contains an ambiguous colon. Use encrypted backup to preserve these account labels.');
  }
  const label = account.issuer ? `${account.issuer}:${account.name}` : account.name;
  const params = new URLSearchParams({
    secret: account.secret,
    algorithm: account.algorithm,
    digits: String(account.digits),
    period: String(account.period),
  });
  if (account.issuer) params.set('issuer', account.issuer);
  return `otpauth://totp/${encodeURIComponent(label)}?${params}`;
}

const ERROR_REASONS = new Map([
  ['Invalid Base32 secret', 'Invalid secret key'],
  ['Invalid OTP URI', 'Not a valid otpauth:// URI'],
  ['Only TOTP URIs are supported', 'Not an otpauth://totp/ URI'],
  ['HOTP is not supported', 'Only TOTP is supported (HOTP found)'],
  ['Invalid OTP label', 'Invalid account label'],
  ['Missing account name', 'Missing account name'],
  ['Invalid OTP issuer', 'Invalid service name'],
  ['OTP issuers do not match', 'Service names do not match'],
  ['Invalid OTP digits', 'Digits must be 6–8'],
  ['Invalid OTP period', 'Period must be 1–300 seconds'],
  ['Account already exists', 'Account already exists'],
]);

function describeIssue(issue?: z.core.$ZodIssue): string {
  switch (issue?.path[0]) {
    case 'name':
      return issue.code === 'too_big' ? 'Account name is too long' : 'Missing account name';
    case 'issuer':
      return 'Service name is too long';
    case 'secret':
      return issue.message === 'Missing secret key' ? issue.message : 'Invalid secret key';
    case 'algorithm':
      return 'Algorithm must be SHA1, SHA256 or SHA512';
    case 'digits':
      return 'Digits must be 6–8';
    case 'period':
      return 'Period must be 1–300 seconds';
    default:
      return 'Invalid account';
  }
}

// Short, secret-free reason for why an account could not be created; safe to show in alerts and toasts.
export function describeAccountError(error: unknown): string {
  if (error instanceof z.ZodError) return describeIssue(error.issues[0]);
  if (!(error instanceof Error)) return 'Invalid account';
  const known = ERROR_REASONS.get(error.message);
  if (known) return known;
  const param = /^(Unsupported|Duplicate) OTP parameter: [\w.-]*$/.exec(error.message);
  return param ? error.message.replace(' OTP', '') : 'Invalid account';
}

export type ImportLineError = { line: number; reason: string };

// One otpauth://totp/ URI per line. Valid lines are returned even when others fail.
export function parseOtpAuthUriList(text: string): { accounts: NormalizedCreateAccount[]; errors: ImportLineError[] } {
  const accounts: NormalizedCreateAccount[] = [];
  const errors: ImportLineError[] = [];
  text.split(/\r\n|\r|\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    if (line.toLowerCase().startsWith('otpauth-migration:')) {
      errors.push({ line: index + 1, reason: 'Google Authenticator export links must be scanned as QR codes' });
      return;
    }
    try {
      accounts.push(parseOtpAuthUri(line));
    } catch (error) {
      errors.push({ line: index + 1, reason: describeAccountError(error) });
    }
  });
  return { accounts, errors };
}

export function describeInvalidLines(errors: ImportLineError[], limit = 5): string {
  const lines = errors.slice(0, limit).map((item) => `Line ${item.line}: ${item.reason}`);
  if (errors.length > limit) lines.push(`+${errors.length - limit} more`);
  return lines.join('\n');
}

export function summarizeImport(counts: {
  added: number;
  duplicates?: number;
  invalid?: number;
  unsupported?: number;
}): string {
  const { added, duplicates = 0, invalid = 0, unsupported = 0 } = counts;
  return [
    `${added} added`,
    duplicates && `${duplicates} ${duplicates === 1 ? 'duplicate' : 'duplicates'} skipped`,
    invalid && `${invalid} invalid skipped`,
    unsupported && `${unsupported} unsupported skipped`,
  ]
    .filter(Boolean)
    .join(' · ');
}

export type AccountFilter = 'all' | 'favorites' | 'recent';
export type AccountSection = { title: string; items: Account[]; reorderable: boolean };

export const RECENT_LIMIT = 5;

// Each account lands in exactly one section; only manually ordered sections can be reordered.
export function groupAccounts(accounts: Account[], filter: AccountFilter = 'all'): AccountSection[] {
  const favourites = accounts.filter((account) => account.favorite);
  const used = accounts
    .filter((account) => account.lastUsedAt !== undefined)
    .sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0));
  let sections: AccountSection[];
  if (filter === 'favorites') {
    sections = [{ title: 'Favourites', items: favourites, reorderable: true }];
  } else if (filter === 'recent') {
    sections = [{ title: 'Recently Used', items: used, reorderable: false }];
  } else {
    const recent = used.filter((account) => !account.favorite).slice(0, RECENT_LIMIT);
    const taken = new Set(recent);
    sections = [
      { title: 'Favourites', items: favourites, reorderable: true },
      { title: 'Recent', items: recent, reorderable: false },
      { title: 'Accounts', items: accounts.filter((a) => !a.favorite && !taken.has(a)), reorderable: true },
    ];
  }
  return sections.filter((section) => section.items.length);
}

// Moves `id` to index `to` of `ids`; the accounts in between shift by one.
export function moveId(ids: string[], id: string, to: number): string[] {
  if (!ids.includes(id)) return ids;
  const rest = ids.filter((item) => item !== id);
  rest.splice(Math.max(0, Math.min(to, rest.length)), 0, id);
  return rest;
}

// Puts the accounts named by `ids` in that order, using only the places they already hold, so accounts listed in
// other sections keep theirs: [A, b, C] reordered as [C, A] gives [C, b, A].
export function reorderAccounts<T extends { id: string }>(accounts: T[], ids: string[]): T[] {
  const byId = new Map(accounts.map((account) => [account.id, account]));
  const queue = [...new Set(ids)].flatMap((id) => byId.get(id) ?? []);
  const moving = new Set(queue.map((account) => account.id));
  return accounts.map((account) => (moving.has(account.id) ? queue.shift()! : account));
}

export function accountLabel(account: Pick<Account, 'name' | 'issuer'>): string {
  return account.issuer || account.name;
}

function isSubsequence(needle: string, haystack: string): boolean {
  let index = 0;
  for (const char of haystack) if (char === needle[index]) index++;
  return index === needle.length;
}

function matchScore(account: Account, query: string): number {
  const fields = [account.issuer, account.name]
    .filter((field): field is string => !!field)
    .map((field) => field.toLocaleLowerCase());
  let score = 0;
  for (const field of fields) {
    if (field === query) score = Math.max(score, 5);
    else if (field.startsWith(query)) score = Math.max(score, 4);
    else if (field.split(/[\s@._:+-]+/).some((word) => word.startsWith(query))) score = Math.max(score, 3);
    else if (field.includes(query)) score = Math.max(score, 2);
  }
  const combined = fields.join(' ');
  if (!score && query.split(/\s+/).every((term) => combined.includes(term))) score = 2;
  if (!score && isSubsequence(query.replace(/\s+/g, ''), combined.replace(/\s+/g, ''))) score = 1;
  return score;
}

// Best account for a typed query: closer matches win, then the most recently used, then favourites, then stored order.
export function findBestAccount(accounts: Account[], query: string): Account | undefined {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return undefined;
  let best: { account: Account; score: number } | undefined;
  for (const account of accounts) {
    const score = matchScore(account, normalized);
    if (!score || (best && score < best.score)) continue;
    if (
      !best ||
      score > best.score ||
      (account.lastUsedAt ?? 0) > (best.account.lastUsedAt ?? 0) ||
      ((account.lastUsedAt ?? 0) === (best.account.lastUsedAt ?? 0) && account.favorite && !best.account.favorite)
    ) {
      best = { account, score };
    }
  }
  return best?.account;
}
