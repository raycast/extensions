// GENERATO da scripts/vendor.mjs — non modificare: modifica packages/ e rilancia `npm run vendor`.
/**
 * Primitive di lettura senza dipendenze dal DOM (funzionano in browser, service
 * worker e Node): decodifica del testo, CSV RFC 4180, mini-parser XML, ZIP.
 */
import { unzipSync } from "fflate";

// ---------- testo ----------

/** Decodifica rispettando il BOM; senza BOM prova UTF-8 e ripiega su Windows-1252. */
export function decodeText(bytes: Uint8Array): string {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return new TextDecoder("utf-8").decode(bytes.subarray(3));
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    try {
      return new TextDecoder("windows-1252").decode(bytes);
    } catch {
      return new TextDecoder("utf-8").decode(bytes);
    }
  }
}

// ---------- CSV ----------

/** Sceglie il separatore (`,` `;` tab) contando le occorrenze fuori dalle virgolette nella prima riga. */
export function detectDelimiter(text: string): string {
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  let inQuotes = false;
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (ch === "\n" || ch === "\r")) break;
    else if (!inQuotes && ch in counts) counts[ch]!++;
  }
  let best = ",";
  for (const d of [";", "\t"]) if (counts[d]! > counts[best]!) best = d;
  return best;
}

/** Parser CSV RFC 4180: virgolette doppie, `""` come escape, a capo dentro i campi, CRLF. Le righe vuote sono scartate. */
export function parseCsv(text: string, delimiter = detectDelimiter(text)): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  const pushRow = () => {
    row.push(field);
    field = "";
    if (row.some((c) => c.trim() !== "")) rows.push(row);
    row = [];
  };
  while (i < n) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"' && field.trim() === "") {
      field = "";
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\r") {
      if (text[i + 1] === "\n") i++;
      pushRow();
    } else if (ch === "\n") {
      pushRow();
    } else {
      field += ch;
    }
    i++;
  }
  if (field !== "" || row.length) pushRow();
  return rows;
}

/** Riga CSV con accesso per nome di colonna (case-insensitive, spazi ignorati). */
export class CsvRecord {
  constructor(
    private readonly index: Map<string, number>,
    readonly cells: string[],
  ) {}

  /** Primo valore non vuoto fra le colonne indicate. */
  get(...names: string[]): string {
    for (const name of names) {
      const i = this.index.get(headerKey(name));
      if (i !== undefined) {
        const v = this.cells[i] ?? "";
        if (v !== "") return v;
      }
    }
    return "";
  }

  has(name: string): boolean {
    return this.index.has(headerKey(name));
  }
}

export const headerKey = (h: string) => h.replace(/^﻿/, "").trim().toLowerCase();

export interface CsvTable {
  headers: string[];
  records: CsvRecord[];
}

/** Tabella CSV con intestazione nella prima riga. */
export function csvTable(text: string): CsvTable {
  const rows = parseCsv(text);
  const headers = (rows[0] ?? []).map((h) => h.replace(/^﻿/, "").trim());
  const index = new Map<string, number>();
  headers.forEach((h, i) => {
    const k = headerKey(h);
    if (!index.has(k)) index.set(k, i);
  });
  return { headers, records: rows.slice(1).map((r) => new CsvRecord(index, r)) };
}

// ---------- XML ----------

export interface XmlNode {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}

const ENTITIES: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Mini-parser XML sufficiente per gli export (elementi, attributi, testo, CDATA, commenti). */
export function parseXml(text: string): XmlNode {
  const root: XmlNode = { name: "#document", attrs: {}, children: [], text: "" };
  const stack: XmlNode[] = [root];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const lt = text.indexOf("<", i);
    const top = stack[stack.length - 1]!;
    if (lt < 0) {
      top.text += decodeEntities(text.slice(i));
      break;
    }
    if (lt > i) top.text += decodeEntities(text.slice(i, lt));
    if (text.startsWith("<!--", lt)) {
      const end = text.indexOf("-->", lt + 4);
      i = end < 0 ? n : end + 3;
    } else if (text.startsWith("<![CDATA[", lt)) {
      const end = text.indexOf("]]>", lt + 9);
      top.text += text.slice(lt + 9, end < 0 ? n : end);
      i = end < 0 ? n : end + 3;
    } else if (text[lt + 1] === "?" || text[lt + 1] === "!") {
      const end = text.indexOf(">", lt);
      i = end < 0 ? n : end + 1;
    } else if (text[lt + 1] === "/") {
      const end = text.indexOf(">", lt);
      const name = text.slice(lt + 2, end).trim();
      // chiude fino all'elemento omonimo (tollerante verso XML malformato)
      for (let k = stack.length - 1; k > 0; k--) {
        if (stack[k]!.name === name) {
          stack.length = k;
          break;
        }
      }
      i = end < 0 ? n : end + 1;
    } else {
      // tag di apertura: attenzione ai ">" dentro i valori degli attributi
      let j = lt + 1;
      let quote: string | null = null;
      while (j < n) {
        const c = text[j]!;
        if (quote) {
          if (c === quote) quote = null;
        } else if (c === '"' || c === "'") quote = c;
        else if (c === ">") break;
        j++;
      }
      let inner = text.slice(lt + 1, j);
      const selfClosing = inner.endsWith("/");
      if (selfClosing) inner = inner.slice(0, -1);
      const nameMatch = /^[^\s/>]+/.exec(inner);
      const node: XmlNode = { name: nameMatch ? nameMatch[0] : "", attrs: {}, children: [], text: "" };
      const attrRe = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
      let a: RegExpExecArray | null;
      while ((a = attrRe.exec(inner.slice(node.name.length)))) node.attrs[a[1]!] = decodeEntities(a[3] ?? a[4] ?? "");
      top.children.push(node);
      if (!selfClosing) stack.push(node);
      i = j + 1;
    }
  }
  return root;
}

export const xmlChild = (n: XmlNode | undefined, name: string) => n?.children.find((c) => c.name === name);
export const xmlChildren = (n: XmlNode | undefined, name: string) => n?.children.filter((c) => c.name === name) ?? [];
export const xmlText = (n: XmlNode | undefined, name: string) => xmlChild(n, name)?.text ?? "";

// ---------- ZIP ----------

export const isZip = (b: Uint8Array) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;

/** Estrae uno ZIP in memoria (percorso → contenuto). Le cartelle sono omesse. */
export function unzip(bytes: Uint8Array): Map<string, Uint8Array> {
  const out = unzipSync(bytes);
  const map = new Map<string, Uint8Array>();
  for (const [path, data] of Object.entries(out)) if (!path.endsWith("/")) map.set(path, data);
  return map;
}

/** Cerca un file nello ZIP per nome (ultimo segmento del percorso, case-insensitive). */
export function zipFind(entries: Map<string, Uint8Array>, name: string): Uint8Array | undefined {
  const target = name.toLowerCase();
  for (const [path, data] of entries) {
    const base = path.split("/").pop()!.toLowerCase();
    if (base === target || path.toLowerCase() === target) return data;
  }
  return undefined;
}
