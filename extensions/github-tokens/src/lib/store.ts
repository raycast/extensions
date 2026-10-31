import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";

/**
 * Tudo mora no LocalStorage do Raycast, que fica no banco criptografado da
 * própria extensão (não é arquivo solto em disco). Um único registro JSON
 * guarda pastas e tokens; a versão anterior fica em VAULT_PREV_KEY como rede
 * de segurança contra gravação ruim.
 */
const VAULT_KEY = "vault-v1";
const VAULT_PREV_KEY = "vault-v1-prev";

export const NO_FOLDER = "__none__";

export type Folder = {
  id: string;
  name: string;
  createdAt: number;
};

export type TokenEntry = {
  id: string;
  name: string;
  token: string;
  folderId: string | null;
  note?: string;
  createdAt: number;
  updatedAt: number;
};

export type Vault = {
  version: 1;
  folders: Folder[];
  tokens: TokenEntry[];
};

export class VaultError extends Error {}

function emptyVault(): Vault {
  return { version: 1, folders: [], tokens: [] };
}

function parseVault(raw: string): Vault {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Não sobrescreve nada: um cofre ilegível precisa travar, não zerar.
    throw new VaultError("O cofre de tokens está ilegível. Nada foi alterado.");
  }
  const obj = (parsed ?? {}) as Partial<Vault>;
  return {
    version: 1,
    folders: Array.isArray(obj.folders) ? obj.folders : [],
    tokens: Array.isArray(obj.tokens) ? obj.tokens : [],
  };
}

export async function loadVault(): Promise<Vault> {
  const raw = await LocalStorage.getItem<string>(VAULT_KEY);
  if (!raw) return emptyVault();
  return parseVault(raw);
}

// Fila: duas alterações seguidas nunca leem o mesmo estado antigo.
let queue: Promise<unknown> = Promise.resolve();

async function mutate<T>(fn: (vault: Vault) => T): Promise<T> {
  const run = queue.then(async () => {
    const raw = await LocalStorage.getItem<string>(VAULT_KEY);
    const vault = raw ? parseVault(raw) : emptyVault();
    const result = fn(vault);
    if (raw) await LocalStorage.setItem(VAULT_PREV_KEY, raw);
    await LocalStorage.setItem(VAULT_KEY, JSON.stringify(vault));
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

// ---------- pastas ----------

/** Cria a pasta; se já existir uma com o mesmo nome (sem acento/caixa), devolve a existente. */
export function addFolder(name: string): Promise<Folder> {
  const clean = name.trim();
  if (!clean) return Promise.reject(new VaultError("Informe o nome da pasta."));
  return mutate((v) => {
    const existing = v.folders.find((f) => norm(f.name) === norm(clean));
    if (existing) return existing;
    const folder: Folder = { id: randomUUID(), name: clean, createdAt: Date.now() };
    v.folders.push(folder);
    return folder;
  });
}

export function renameFolder(id: string, name: string): Promise<void> {
  const clean = name.trim();
  if (!clean) return Promise.reject(new VaultError("Informe o nome da pasta."));
  return mutate((v) => {
    const folder = v.folders.find((f) => f.id === id);
    if (!folder) throw new VaultError("Pasta não encontrada.");
    const clash = v.folders.find((f) => f.id !== id && norm(f.name) === norm(clean));
    if (clash) throw new VaultError(`Já existe a pasta "${clash.name}".`);
    folder.name = clean;
  });
}

/** Exclui a pasta. Os tokens dela NÃO são apagados: vão para "Sem pasta". */
export function deleteFolder(id: string): Promise<number> {
  return mutate((v) => {
    let moved = 0;
    for (const t of v.tokens) {
      if (t.folderId === id) {
        t.folderId = null;
        moved++;
      }
    }
    v.folders = v.folders.filter((f) => f.id !== id);
    return moved;
  });
}

// ---------- tokens ----------

export type TokenInput = {
  name: string;
  token: string;
  folderId: string | null;
  note?: string;
};

function validate(input: TokenInput): TokenInput {
  const name = input.name.trim();
  const token = input.token.trim();
  if (!name) throw new VaultError("Informe o nome do token.");
  if (!token) throw new VaultError("Cole o token.");
  if (/\s/.test(token)) throw new VaultError("O token não pode ter espaços ou quebras de linha.");
  const note = input.note?.trim() || undefined;
  return { name, token, folderId: input.folderId, note };
}

export function addToken(input: TokenInput): Promise<TokenEntry> {
  let clean: TokenInput;
  try {
    clean = validate(input);
  } catch (e) {
    return Promise.reject(e);
  }
  return mutate((v) => {
    const dup = v.tokens.find((t) => t.token === clean.token);
    if (dup) throw new VaultError(`Esse token já está salvo como "${dup.name}".`);
    if (clean.folderId && !v.folders.some((f) => f.id === clean.folderId)) clean.folderId = null;
    const now = Date.now();
    const entry: TokenEntry = { id: randomUUID(), ...clean, createdAt: now, updatedAt: now };
    v.tokens.push(entry);
    return entry;
  });
}

export function updateToken(id: string, input: TokenInput): Promise<void> {
  let clean: TokenInput;
  try {
    clean = validate(input);
  } catch (e) {
    return Promise.reject(e);
  }
  return mutate((v) => {
    const entry = v.tokens.find((t) => t.id === id);
    if (!entry) throw new VaultError("Token não encontrado.");
    const dup = v.tokens.find((t) => t.id !== id && t.token === clean.token);
    if (dup) throw new VaultError(`Esse token já está salvo como "${dup.name}".`);
    if (clean.folderId && !v.folders.some((f) => f.id === clean.folderId)) clean.folderId = null;
    Object.assign(entry, clean, { updatedAt: Date.now() });
    if (!clean.note) delete entry.note;
  });
}

export function moveToken(id: string, folderId: string | null): Promise<void> {
  return mutate((v) => {
    const entry = v.tokens.find((t) => t.id === id);
    if (!entry) throw new VaultError("Token não encontrado.");
    entry.folderId = folderId && v.folders.some((f) => f.id === folderId) ? folderId : null;
    entry.updatedAt = Date.now();
  });
}

export function deleteToken(id: string): Promise<void> {
  return mutate((v) => {
    v.tokens = v.tokens.filter((t) => t.id !== id);
  });
}

// ---------- utilidades de exibição ----------

export function sortFolders(folders: Folder[]): Folder[] {
  return [...folders].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
}

export function sortTokens(tokens: TokenEntry[]): TokenEntry[] {
  return [...tokens].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
