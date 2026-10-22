import { closeSync, openSync, readFileSync, readSync } from "node:fs";
import { IndexRow, normalizeKey } from "./convert";
import { DAT_PATH, IDX_PATH } from "./data";

export interface Entry {
  id: number;
  key: string;
  title: string;
  homonym: number;
  offset: number;
  length: number;
}

export type MatchKind = "exact" | "prefix" | "contains";

export interface Match {
  entry: Entry;
  kind: MatchKind;
}

let cache: Entry[] | undefined;

/** Charge l'index (≈ 3 Mo) une seule fois par session de commande ; les données doivent être installées (ensureData). */
export function loadIndex(): Entry[] {
  if (cache) return cache;
  const rows = JSON.parse(readFileSync(IDX_PATH, "utf8")) as IndexRow[];
  cache = rows.map(([key, title, homonym, offset, length], id) => ({ id, key, title, homonym, offset, length }));
  return cache;
}

/**
 * Recherche : correspondances exactes, puis préfixes, puis sous-chaînes.
 * Les sous-chaînes ne sont explorées que si la requête fait au moins 3 caractères.
 */
export function search(query: string, limit: number): Match[] {
  const q = normalizeKey(query);
  if (!q) return [];
  const index = loadIndex();

  const exact: Match[] = [];
  const prefix: Match[] = [];
  const contains: Match[] = [];

  for (const entry of index) {
    const k = entry.key;
    if (k === q) exact.push({ entry, kind: "exact" });
    else if (k.startsWith(q)) {
      if (exact.length + prefix.length < limit) prefix.push({ entry, kind: "prefix" });
    } else if (q.length >= 3 && k.includes(q)) {
      if (contains.length < limit) contains.push({ entry, kind: "contains" });
    }
  }
  return [...exact, ...prefix, ...contains].slice(0, limit);
}

/** Lit le corps Markdown d'un article directement dans le fichier de données. */
export function readBody(entry: Entry): string {
  const fd = openSync(DAT_PATH, "r");
  try {
    const buf = Buffer.alloc(entry.length);
    readSync(fd, buf, 0, entry.length, entry.offset);
    return buf.toString("utf8");
  } finally {
    closeSync(fd);
  }
}

/** Titre avec n° d'homonyme en exposant : « a ³ ». */
export function displayTitle(entry: Entry): string {
  return entry.homonym ? `${entry.title} ${superscript(entry.homonym)}` : entry.title;
}

const SUP_DIGITS = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
function superscript(n: number): string {
  return String(n)
    .split("")
    .map((d) => SUP_DIGITS[Number(d)])
    .join("");
}

/** Article complet en Markdown (titre + corps). */
export function toMarkdown(entry: Entry, body: string): string {
  return `# ${displayTitle(entry)}\n\n${body}`;
}

/** Version texte brut (pour la copie / le sous-titre). */
export function toPlainText(md: string): string {
  return md
    .replace(/&nbsp;/g, " ")
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\\([*_`[\]<>\\#])/g, "$1")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/** Première ligne de l'article, tronquée, pour le sous-titre de la liste. */
export function gloss(body: string, max = 90): string {
  const text = toPlainText(body)
    .replace(/\s+/g, " ")
    .replace(/^[‖¶]\s*/, "");
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
