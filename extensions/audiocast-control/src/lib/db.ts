import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { environment } from '@raycast/api';
import { resolve } from 'node:path';
import { createLog } from '../lib/debug';
import { AbortedError } from './aborted';
const log = createLog('db');

const DB_PATH = resolve(environment.supportPath, 'audio-cast.db');

const db = new DatabaseSync(DB_PATH);

export async function initDB(signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    throw new AbortedError();
  }

  const table = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'radio'").get() as
    | { name: string }
    | undefined;

  if (!table) {
    log.log('Creating database');
    db.exec(
      'CREATE TABLE radio (id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT NOT NULL, title TEXT NOT NULL, description TEXT)'
    );
  }
}

export async function select<T>(sql: string, params: SQLInputValue[] = [], signal?: AbortSignal): Promise<T[]> {
  if (signal?.aborted) {
    throw new AbortedError();
  }

  return db.prepare(sql).all(...params) as T[];
}

export async function selectOne<T>(
  sql: string,
  params: SQLInputValue[] = [],
  signal?: AbortSignal
): Promise<T | undefined> {
  if (signal?.aborted) {
    throw new AbortedError();
  }

  return db.prepare(sql).get(...params) as T | undefined;
}

export async function insert(sql: string, params: SQLInputValue[] = [], signal?: AbortSignal): Promise<number> {
  if (signal?.aborted) {
    throw new AbortedError();
  }

  return Number(db.prepare(sql).run(...params).lastInsertRowid);
}

export async function update(sql: string, params: SQLInputValue[] = [], signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    throw new AbortedError();
  }

  db.prepare(sql).run(...params);
}

export async function del(sql: string, params: SQLInputValue[] = [], signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    throw new AbortedError();
  }

  db.prepare(sql).run(...params);
}
