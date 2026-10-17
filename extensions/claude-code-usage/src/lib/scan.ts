import { createReadStream } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { environment } from "@raycast/api";
import { costOf, pricingFor } from "./pricing";
import { projectsDir } from "./paths";

/**
 * Le os transcripts locais do Claude Code e agrega tokens e custo.
 *
 * Sao ~174 MB de JSONL, entao a leitura completa so acontece uma vez: o
 * resultado por arquivo vai para um cache indexado por (mtime, tamanho) e as
 * execucoes seguintes releem apenas os arquivos que mudaram — na pratica, os da
 * sessao de hoje.
 */

const CACHE_VERSION = 3;

/** Uma entrada = uma resposta do assistente com bloco `usage`. */
export type Entry = {
  /** Chave de deduplicacao: a mesma mensagem aparece em varios arquivos quando uma sessao e retomada. */
  key: string;
  day: string; // YYYY-MM-DD no fuso local
  model: string;
  fast: boolean;
  input: number;
  output: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  cacheRead: number;
};

type FileCache = {
  mtimeMs: number;
  size: number;
  project: string;
  entries: CompactEntry[];
};

/** Formato compacto no disco: array posicional em vez de objeto por entrada. */
type CompactEntry = [string, string, string, 0 | 1, number, number, number, number, number];

type Cache = { version: number; files: Record<string, FileCache> };

function toCompact(e: Entry): CompactEntry {
  return [e.key, e.day, e.model, e.fast ? 1 : 0, e.input, e.output, e.cacheWrite5m, e.cacheWrite1h, e.cacheRead];
}

function fromCompact(c: CompactEntry): Entry {
  return {
    key: c[0],
    day: c[1],
    model: c[2],
    fast: c[3] === 1,
    input: c[4],
    output: c[5],
    cacheWrite5m: c[6],
    cacheWrite1h: c[7],
    cacheRead: c[8],
  };
}

function localDay(iso: string | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "0000-00-00";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let items;
  try {
    items = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...(await walk(full)));
    else if (item.isFile() && item.name.endsWith(".jsonl")) out.push(full);
  }
  return out;
}

type RawUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_creation?: { ephemeral_5m_input_tokens?: number; ephemeral_1h_input_tokens?: number };
  speed?: string;
};

type RawLine = {
  type?: string;
  timestamp?: string;
  uuid?: string;
  requestId?: string;
  cwd?: string;
  message?: { id?: string; model?: string; usage?: RawUsage };
};

async function parseFile(file: string): Promise<{ entries: Entry[]; project: string }> {
  const entries: Entry[] = [];
  let project = "";

  const rl = readline.createInterface({
    input: createReadStream(file, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    // Filtro barato antes do JSON.parse: a esmagadora maioria das linhas nao tem uso.
    if (line.length < 40 || !line.includes('"usage"')) continue;

    let d: RawLine;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    if (d.type !== "assistant") continue;
    const usage = d.message?.usage;
    if (!usage) continue;

    if (!project && d.cwd) project = path.basename(d.cwd);

    const creation = usage.cache_creation;
    const cw5 = creation?.ephemeral_5m_input_tokens ?? usage.cache_creation_input_tokens ?? 0;
    const cw1 = creation?.ephemeral_1h_input_tokens ?? 0;

    entries.push({
      key: d.message?.id && d.requestId ? `${d.message.id}:${d.requestId}` : (d.uuid ?? `${file}:${entries.length}`),
      day: localDay(d.timestamp),
      model: d.message?.model ?? "desconhecido",
      fast: usage.speed === "fast",
      input: usage.input_tokens ?? 0,
      output: usage.output_tokens ?? 0,
      cacheWrite5m: cw5,
      cacheWrite1h: cw1,
      cacheRead: usage.cache_read_input_tokens ?? 0,
    });
  }

  if (!project) project = path.basename(path.dirname(file));
  return { entries, project };
}

function cachePath(): string {
  return path.join(environment.supportPath, "usage-cache.json");
}

async function loadCache(): Promise<Cache> {
  try {
    const parsed = JSON.parse(await readFile(cachePath(), "utf8")) as Cache;
    if (parsed.version === CACHE_VERSION && parsed.files) return parsed;
  } catch {
    // cache ausente ou de versao anterior: reconstroi
  }
  return { version: CACHE_VERSION, files: {} };
}

async function saveCache(cache: Cache): Promise<void> {
  await mkdir(environment.supportPath, { recursive: true });
  await writeFile(cachePath(), JSON.stringify(cache), "utf8");
}

export type ScanResult = {
  entries: Entry[];
  /** projeto -> chaves de entradas daquele projeto */
  projectOf: Map<string, string>;
  filesScanned: number;
  filesReparsed: number;
};

export async function scanUsage(onProgress?: (done: number, total: number) => void): Promise<ScanResult> {
  const files = await walk(projectsDir());
  const cache = await loadCache();
  const next: Cache = { version: CACHE_VERSION, files: {} };

  const entries: Entry[] = [];
  const seen = new Set<string>();
  const projectOf = new Map<string, string>();
  let reparsed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    let info;
    try {
      info = await stat(file);
    } catch {
      continue;
    }

    const cached = cache.files[file];
    let record: FileCache;

    if (cached && cached.mtimeMs === info.mtimeMs && cached.size === info.size) {
      record = cached;
    } else {
      const { entries: parsed, project } = await parseFile(file);
      record = { mtimeMs: info.mtimeMs, size: info.size, project, entries: parsed.map(toCompact) };
      reparsed++;
    }

    next.files[file] = record;

    for (const compact of record.entries) {
      const e = fromCompact(compact);
      if (seen.has(e.key)) continue; // sessao retomada duplica a mesma mensagem em outro arquivo
      seen.add(e.key);
      entries.push(e);
      projectOf.set(e.key, record.project);
    }

    onProgress?.(i + 1, files.length);
  }

  await saveCache(next);
  return { entries, projectOf, filesScanned: files.length, filesReparsed: reparsed };
}

// ---------------------------------------------------------------------------
// Agregacao
// ---------------------------------------------------------------------------

export type Totals = {
  input: number;
  output: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  cacheRead: number;
  cost: number;
  messages: number;
};

export function emptyTotals(): Totals {
  return { input: 0, output: 0, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0, cost: 0, messages: 0 };
}

export function addEntry(t: Totals, e: Entry): Totals {
  const price = pricingFor(e.model, e.day, e.fast ? "fast" : undefined);
  t.input += e.input;
  t.output += e.output;
  t.cacheWrite5m += e.cacheWrite5m;
  t.cacheWrite1h += e.cacheWrite1h;
  t.cacheRead += e.cacheRead;
  t.cost += costOf(e, price);
  t.messages += 1;
  return t;
}

export function totalTokens(t: Totals): number {
  return t.input + t.output + t.cacheWrite5m + t.cacheWrite1h + t.cacheRead;
}

export function groupBy(entries: Entry[], keyOf: (e: Entry) => string): Map<string, Totals> {
  const map = new Map<string, Totals>();
  for (const e of entries) {
    const k = keyOf(e);
    let t = map.get(k);
    if (!t) {
      t = emptyTotals();
      map.set(k, t);
    }
    addEntry(t, e);
  }
  return map;
}
