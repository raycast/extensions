import { statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const CONNECTION_TYPES = ['local', 'remote', 'tailscale', 'url', 'saved', 'recent'] as const;

export type ConnectionType = (typeof CONNECTION_TYPES)[number];

export type ClientProtocol = 'vnc' | 'rdp';

export interface Connection {
  id: string;
  name: string;
  hostname: string;
  type: ConnectionType;
  clientProtocol: ClientProtocol;
  port: number;
  publicIpAddress?: string;
  publicPort?: number;
  sourceURL?: string;
  username?: string;
  lastConnectionDate?: Date;
  numberOfConnections: number;
}

export interface Archive {
  connections: Connection[];
  exportedAt: Date;
}

export type ArchiveErrorType = 'FILE_NOT_FOUND' | 'UNREADABLE' | 'INVALID_JSON' | 'NOT_AN_ARCHIVE';

export class ArchiveError extends Error {
  constructor(
    readonly type: ArchiveErrorType,
    readonly path: string,
    readonly originalError?: string,
  ) {
    super(`${type} while reading ${path}`);
    this.name = 'ArchiveError';
  }
}

// Core Data stores dates as seconds since 2001-01-01, and uses a far-past sentinel for "never".
const CORE_DATA_EPOCH_OFFSET_SECONDS = 978307200;
const NEVER_CONNECTED = -63114076800;

/**
 * The archive's modification time, which is the real export time. Returns 0 when the file is
 * missing or unreadable so callers can use it as a cache key.
 */
export function archiveModifiedAt(path: string): number {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
}

/**
 * Reads a `.screens` archive exported from Screens → Settings → Archives → Export….
 *
 * `modifiedAt` comes from {@link archiveModifiedAt} and serves as both the cache key and the
 * export date: the archive's own `filename` field lags the real export.
 */
export async function readArchive(path: string, modifiedAt: number): Promise<Archive> {
  let contents: string;
  try {
    contents = await readFile(path, 'utf8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    const type = code === 'ENOENT' ? 'FILE_NOT_FOUND' : 'UNREADABLE';
    throw new ArchiveError(type, path, error instanceof Error ? error.message : String(error));
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    throw new ArchiveError('INVALID_JSON', path, error instanceof Error ? error.message : String(error));
  }

  // Screens calls these connections, but serializes them under `screens`.
  const raw = parsed as { screens?: unknown };
  if (!Array.isArray(raw.screens)) {
    throw new ArchiveError('NOT_AN_ARCHIVE', path);
  }

  return {
    connections: raw.screens.map(parseConnection).filter((entry): entry is Connection => entry !== undefined),
    exportedAt: new Date(modifiedAt),
  };
}

type RawConnection = {
  id?: unknown;
  name?: unknown;
  hostname?: unknown;
  type?: unknown;
  clientProtocol?: unknown;
  port?: unknown;
  publicIpAddress?: unknown;
  publicPort?: unknown;
  sourceURL?: unknown;
  users?: unknown;
  lastConnectionDate?: unknown;
  numberOfConnections?: unknown;
};

function parseConnection(value: unknown): Connection | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const raw = value as RawConnection;

  const id = typeof raw.id === 'string' ? raw.id : undefined;
  if (!id) return undefined;

  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const hostname = typeof raw.hostname === 'string' ? raw.hostname : '';
  const sourceURL = nonEmptyString(raw.sourceURL);

  // Every URL scheme Screens accepts addresses a connection by one of these three. An entry holding
  // none of them is one nothing can open and no row can label, so it is dropped.
  if (!name && !hostname.trim() && !sourceURL) return undefined;

  return {
    id,
    name,
    hostname,
    type: parseType(raw.type),
    clientProtocol: raw.clientProtocol === 'rdp' ? 'rdp' : 'vnc',
    port: typeof raw.port === 'number' ? raw.port : 0,
    publicIpAddress: nonEmptyString(raw.publicIpAddress),
    publicPort: typeof raw.publicPort === 'number' && raw.publicPort > 0 ? raw.publicPort : undefined,
    sourceURL,
    username: parseUsername(raw.users),
    lastConnectionDate: parseCoreDataDate(raw.lastConnectionDate),
    numberOfConnections: typeof raw.numberOfConnections === 'number' ? raw.numberOfConnections : 0,
  };
}

/** Screens tags the type as a single-key object, e.g. `{"tailscale": {}}`. */
function parseType(value: unknown): ConnectionType {
  if (typeof value !== 'object' || value === null) return 'remote';
  const key = Object.keys(value)[0];
  return CONNECTION_TYPES.find((type) => type === key) ?? 'remote';
}

function parseUsername(users: unknown): string | undefined {
  if (!Array.isArray(users)) return undefined;
  const first = users[0] as { username?: unknown } | undefined;
  return nonEmptyString(first?.username);
}

function parseCoreDataDate(value: unknown): Date | undefined {
  if (typeof value !== 'number' || value === NEVER_CONNECTED) return undefined;
  const date = new Date((value + CORE_DATA_EPOCH_OFFSET_SECONDS) * 1000);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
