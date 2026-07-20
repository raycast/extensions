import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import initSqlJs from "sql.js/dist/sql-asm.js";

export interface AccountRecord {
  domain: string;
  username: string;
  hasOtp: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  lastUsedAt?: string;
}

export interface DiscoveredAccount {
  domain: string;
  username: string;
  hasOtp?: boolean;
}

export interface AccountRepositoryOptions {
  dbPath?: string;
  supportPath?: string;
  now?: () => Date;
}

export interface AccountRepository {
  readonly dbPath: string;
  upsertDiscoveredAccounts(accounts: DiscoveredAccount[]): Promise<void>;
  markAccountUsed(domain: string, username: string): Promise<void>;
  searchAccounts(query: string): Promise<AccountRecord[]>;
  close(): Promise<void>;
}

const DEFAULT_DB_PATH = join(homedir(), ".applepw-raycast", "accounts.sqlite3");
const ACCOUNT_DB_FILENAME = "accounts.sqlite3";
const require = createRequire(join(process.cwd(), "package.json"));

type SqlValue = string | number | Uint8Array | null;

interface SqlStatement {
  bind(params: SqlValue[]): void;
  run(params?: SqlValue[]): void;
  step(): boolean;
  getAsObject(): Record<string, unknown>;
  free(): void;
}

interface SqlDatabase {
  exec(sql: string): void;
  prepare(sql: string): SqlStatement;
  export(): Uint8Array;
  close(): void;
}

interface SqlJsModule {
  Database: new (data?: Uint8Array) => SqlDatabase;
}

type AccountRow = {
  domain: string;
  username: string;
  has_otp: number;
  first_seen_at: string;
  last_seen_at: string;
  last_used_at: string | null;
};

type ScoredRow = {
  row: AccountRow;
  bucket: number;
  strength: number;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS accounts (
  domain TEXT NOT NULL,
  username TEXT NOT NULL,
  has_otp INTEGER NOT NULL DEFAULT 0,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  last_used_at TEXT,
  PRIMARY KEY (domain, username)
);

CREATE INDEX IF NOT EXISTS idx_accounts_username ON accounts(username);
CREATE INDEX IF NOT EXISTS idx_accounts_domain ON accounts(domain);
CREATE INDEX IF NOT EXISTS idx_accounts_last_seen_at ON accounts(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_last_used_at ON accounts(last_used_at DESC);
`;

const SEARCH_CANDIDATE_LIMIT = 200;

let sqlJsPromise: Promise<unknown> | null = null;

async function getSqlJs(): Promise<SqlJsModule> {
  if (!sqlJsPromise) {
    sqlJsPromise = initSqlJs();
  }

  const pendingModule = sqlJsPromise;
  return (await pendingModule) as SqlJsModule;
}

async function openDatabase(dbPath: string): Promise<SqlDatabase> {
  const SQL = await getSqlJs();
  try {
    const data = await readFile(dbPath);
    return new SQL.Database(data);
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return new SQL.Database();
    }

    throw error;
  }
}

function run(db: SqlDatabase, sql: string, params: SqlValue[] = []): void {
  const statement = db.prepare(sql);
  try {
    statement.run(params);
  } finally {
    statement.free();
  }
}

function all<T>(db: SqlDatabase, sql: string, params: SqlValue[] = []): T[] {
  const statement = db.prepare(sql);
  const rows: T[] = [];

  try {
    statement.bind(params);
    while (statement.step()) {
      rows.push(statement.getAsObject() as T);
    }
    return rows;
  } finally {
    statement.free();
  }
}

function close(db: SqlDatabase): void {
  db.close();
}

function normalizeHasOtp(hasOtp?: boolean): number {
  return hasOtp ? 1 : 0;
}

function escapeLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, "\\$&");
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function editDistanceAtMostOne(left: string, right: string): boolean {
  if (left === right) {
    return true;
  }

  const lengthDifference = Math.abs(left.length - right.length);
  if (lengthDifference > 1) {
    return false;
  }

  let i = 0;
  let j = 0;
  let edits = 0;

  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      i += 1;
      j += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) {
      return false;
    }

    if (left.length > right.length) {
      i += 1;
    } else if (right.length > left.length) {
      j += 1;
    } else {
      i += 1;
      j += 1;
    }
  }

  if (i < left.length || j < right.length) {
    edits += 1;
  }

  return edits <= 1;
}

function compareIsoDescending(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  return left > right ? -1 : 1;
}

function compareOptionalIsoDescending(left?: string | null, right?: string | null): number {
  if (!left && !right) {
    return 0;
  }
  if (!left) {
    return 1;
  }
  if (!right) {
    return -1;
  }

  return compareIsoDescending(left, right);
}

function scoreCandidate(row: AccountRow, query: string): ScoredRow | null {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return {
      row,
      bucket: 99,
      strength: 0,
    };
  }

  const domain = row.domain.toLowerCase();
  const username = row.username.toLowerCase();
  const queryTokens = tokenize(normalizedQuery);
  const domainTokens = tokenize(domain);
  const usernameTokens = tokenize(username);

  if (domain === normalizedQuery) {
    return { row, bucket: 0, strength: 0 };
  }

  if (domain.endsWith(`.${normalizedQuery}`)) {
    return { row, bucket: 1, strength: 0 };
  }

  if (
    queryTokens.length > 0 &&
    queryTokens.every((token) => domainTokens.some((candidate) => candidate.startsWith(token)))
  ) {
    return { row, bucket: 2, strength: normalizedQuery.length * -1 };
  }

  if (domain.includes(normalizedQuery)) {
    return { row, bucket: 3, strength: domain.indexOf(normalizedQuery) };
  }

  if (
    queryTokens.length > 0 &&
    queryTokens.every((token) => domainTokens.some((candidate) => editDistanceAtMostOne(candidate, token)))
  ) {
    return { row, bucket: 4, strength: 0 };
  }

  if (editDistanceAtMostOne(domain, normalizedQuery)) {
    return { row, bucket: 4, strength: 1 };
  }

  if (username.startsWith(normalizedQuery)) {
    return { row, bucket: 5, strength: 0 };
  }

  if (username.includes(normalizedQuery)) {
    return { row, bucket: 6, strength: username.indexOf(normalizedQuery) };
  }

  if (
    queryTokens.length > 0 &&
    queryTokens.every((token) => usernameTokens.some((candidate) => editDistanceAtMostOne(candidate, token)))
  ) {
    return { row, bucket: 7, strength: 0 };
  }

  if (editDistanceAtMostOne(username, normalizedQuery)) {
    return { row, bucket: 7, strength: 1 };
  }

  return null;
}

function toRecord(row: {
  domain: string;
  username: string;
  has_otp: number;
  first_seen_at: string;
  last_seen_at: string;
  last_used_at: string | null;
}): AccountRecord {
  return {
    domain: row.domain,
    username: row.username,
    hasOtp: row.has_otp === 1,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    lastUsedAt: row.last_used_at ?? undefined,
  };
}

async function ensureSchema(db: SqlDatabase): Promise<void> {
  db.exec(SCHEMA);
  const columns = all<{ name: string }>(db, "PRAGMA table_info(accounts)");
  if (!columns.some((column) => column.name === "last_used_at")) {
    db.exec("ALTER TABLE accounts ADD COLUMN last_used_at TEXT");
    db.exec("CREATE INDEX IF NOT EXISTS idx_accounts_last_used_at ON accounts(last_used_at DESC)");
  }
}

async function persist(dbPath: string, db: SqlDatabase): Promise<void> {
  await writeFile(dbPath, db.export());
}

async function withTransaction(db: SqlDatabase, action: () => Promise<void>): Promise<void> {
  db.exec("BEGIN IMMEDIATE");

  try {
    await action();
    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // Ignore rollback failures so the original error is preserved.
    }
    throw error;
  }
}

export function resolveAccountDbPath(options: AccountRepositoryOptions = {}): string {
  if (options.dbPath?.trim()) {
    return options.dbPath.trim();
  }

  const supportPath = options.supportPath?.trim() || getRaycastSupportPath();
  if (supportPath) {
    return join(supportPath, ACCOUNT_DB_FILENAME);
  }

  return DEFAULT_DB_PATH;
}

function getRaycastSupportPath(): string | undefined {
  try {
    const api = require("@raycast/api") as {
      environment?: {
        supportPath?: string;
      };
    };

    return api.environment?.supportPath?.trim();
  } catch {
    return undefined;
  }
}

export async function createAccountRepository(options: AccountRepositoryOptions = {}): Promise<AccountRepository> {
  const dbPath = resolveAccountDbPath(options);
  const now = options.now ?? (() => new Date());

  await mkdir(dirname(dbPath), { recursive: true });
  const db = await openDatabase(dbPath);
  await ensureSchema(db);
  await persist(dbPath, db);

  return {
    dbPath,

    async upsertDiscoveredAccounts(accounts: DiscoveredAccount[]): Promise<void> {
      if (accounts.length === 0) {
        return;
      }

      await withTransaction(db, async () => {
        for (const account of accounts) {
          const timestamp = now().toISOString();
          await run(
            db,
            `
              INSERT INTO accounts (domain, username, has_otp, first_seen_at, last_seen_at)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(domain, username) DO UPDATE SET
                has_otp = MAX(has_otp, excluded.has_otp),
                last_seen_at = excluded.last_seen_at
            `,
            [account.domain, account.username, normalizeHasOtp(account.hasOtp), timestamp, timestamp],
          );
        }
      });
      await persist(dbPath, db);
    },

    async markAccountUsed(domain: string, username: string): Promise<void> {
      await run(
        db,
        `
          UPDATE accounts
          SET last_used_at = ?
          WHERE domain = ? AND username = ?
        `,
        [now().toISOString(), domain, username],
      );
      await persist(dbPath, db);
    },

    async searchAccounts(query: string): Promise<AccountRecord[]> {
      const trimmed = query.trim();

      if (!trimmed) {
        const rows = await all<AccountRow>(
          db,
          `
            SELECT domain, username, has_otp, first_seen_at, last_seen_at, last_used_at
            FROM accounts
            ORDER BY last_seen_at DESC, domain ASC, username ASC
          `,
        );

        return rows.map(toRecord);
      }

      const escaped = escapeLikePattern(trimmed);
      const rows = await all<AccountRow>(
        db,
        `
          SELECT domain, username, has_otp, first_seen_at, last_seen_at, last_used_at
          FROM accounts
          WHERE domain = ?
             OR domain LIKE ? ESCAPE '\\'
             OR domain LIKE ? ESCAPE '\\'
             OR username LIKE ? ESCAPE '\\'
             OR username LIKE ? ESCAPE '\\'
          ORDER BY last_seen_at DESC, domain ASC, username ASC
          LIMIT ?
        `,
        [trimmed, `%${escaped}`, `%${escaped}%`, `${escaped}%`, `%${escaped}%`, SEARCH_CANDIDATE_LIMIT],
      );
      const fallbackRows = await all<AccountRow>(
        db,
        `
          SELECT domain, username, has_otp, first_seen_at, last_seen_at, last_used_at
          FROM accounts
          ORDER BY last_seen_at DESC, domain ASC, username ASC
          LIMIT ?
        `,
        [SEARCH_CANDIDATE_LIMIT],
      );
      const candidates = new Map<string, AccountRow>();
      for (const row of rows) {
        candidates.set(`${row.domain}\u0000${row.username}`, row);
      }
      for (const row of fallbackRows) {
        const key = `${row.domain}\u0000${row.username}`;
        if (!candidates.has(key)) {
          candidates.set(key, row);
        }
      }

      return [...candidates.values()]
        .map((row) => scoreCandidate(row, trimmed))
        .filter((row): row is ScoredRow => row !== null)
        .sort((left, right) => {
          const usage = compareOptionalIsoDescending(left.row.last_used_at, right.row.last_used_at);
          if (usage !== 0) {
            return usage;
          }
          if (left.bucket !== right.bucket) {
            return left.bucket - right.bucket;
          }
          if (left.strength !== right.strength) {
            return left.strength - right.strength;
          }

          const recency = compareIsoDescending(left.row.last_seen_at, right.row.last_seen_at);
          if (recency !== 0) {
            return recency;
          }

          const domainComparison = left.row.domain.localeCompare(right.row.domain);
          if (domainComparison !== 0) {
            return domainComparison;
          }

          return left.row.username.localeCompare(right.row.username);
        })
        .map(({ row }) => toRecord(row));
    },

    async close(): Promise<void> {
      await persist(dbPath, db);
      close(db);
    },
  };
}
