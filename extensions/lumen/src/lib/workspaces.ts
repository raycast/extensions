import { LocalStorage } from "@raycast/api";

const KEY = "workspaces";

export interface Workspace {
  id: string;
  name: string;
  path: string;
  aliases: string[];
  number?: number;
}

export async function getWorkspaces(): Promise<Workspace[]> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Workspace[];
  } catch {
    return [];
  }
}

export async function saveWorkspaces(list: Workspace[]): Promise<void> {
  await LocalStorage.setItem(KEY, JSON.stringify(list));
}

export async function upsertWorkspace(w: Workspace): Promise<void> {
  const list = await getWorkspaces();
  const i = list.findIndex((o) => o.id === w.id);
  if (i >= 0) list[i] = w;
  else list.push(w);
  await saveWorkspaces(list);
}

export async function deleteWorkspace(id: string): Promise<void> {
  const list = await getWorkspaces();
  await saveWorkspaces(list.filter((o) => o.id !== id));
}

export interface Collision {
  field: "alias" | "number";
  value: string;
  otherName: string;
}

// Alias y número son únicos entre todos los workspaces. Compara contra el resto
// (excluye el id propio para que editar no choque consigo mismo).
export function findCollisions(w: Workspace, list: Workspace[]): Collision[] {
  const others = list.filter((o) => o.id !== w.id);
  const collisions: Collision[] = [];
  for (const alias of w.aliases) {
    const hit = others.find((o) => o.aliases.includes(alias));
    if (hit) collisions.push({ field: "alias", value: alias, otherName: hit.name });
  }
  if (w.number !== undefined) {
    const hit = others.find((o) => o.number === w.number);
    if (hit) collisions.push({ field: "number", value: String(w.number), otherName: hit.name });
  }
  return collisions;
}

// "cr, Ceramica, c" -> ["cr", "ceramica", "c"]. Minúsculas forzadas, sin vacíos.
export function parseAliases(raw: string): string[] {
  return raw
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter((a) => a.length > 0);
}
