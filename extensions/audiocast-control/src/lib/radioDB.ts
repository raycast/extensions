import { select, selectOne, insert, update, del } from './db';

export interface Radio {
  id: number;
  url: string;
  title: string;
  description: string | null;
}

export async function add(url: string, title: string, description: string | null, signal?: AbortSignal): Promise<void> {
  await insert('INSERT INTO radio (url, title, description) VALUES (?, ?, ?)', [url, title, description ?? ''], signal);
}

export async function edit(id: number, title: string, description: string | null, signal?: AbortSignal): Promise<void> {
  await update('UPDATE radio SET title = ?, description = ? WHERE id = ?', [title, description ?? '', id], signal);
}

export async function remove(id: number, signal?: AbortSignal): Promise<void> {
  await del('DELETE FROM radio WHERE id = ?', [id], signal);
}

export async function getAll(signal?: AbortSignal): Promise<Radio[]> {
  return await select<Radio>('SELECT * FROM radio', [], signal);
}

export async function findByUrl(url: string, signal?: AbortSignal): Promise<Radio | null> {
  return (await selectOne<Radio>('SELECT * FROM radio WHERE url = ? LIMIT 1', [url], signal)) ?? null;
}
