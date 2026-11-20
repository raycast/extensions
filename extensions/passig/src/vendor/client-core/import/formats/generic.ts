// GENERATED from packages/ by the Passig monorepo — do not edit by hand.
import { csvTable, headerKey } from "../io.js";
import { truthy, type Collector, type DraftField } from "../normalize.js";
import { ImportError, type CsvMapping, type CsvTarget } from "../types.js";

/** Sinonimi (it/en) per riconoscere le colonne di un CSV qualsiasi. */
const SYNONYMS: Record<Exclude<CsvTarget, "field" | "ignore">, string[]> = {
  title: ["title", "name", "titolo", "nome", "account", "entry", "item", "label", "etichetta", "servizio", "service"],
  username: ["username", "user", "user name", "login", "login name", "login_username", "email", "e-mail", "utente", "nome utente", "userid", "user id"],
  password: ["password", "pass", "pwd", "passwd", "login_password", "parola d'ordine", "chiave"],
  url: ["url", "uri", "urls", "website", "web site", "sito", "sito web", "login_uri", "link", "hostname", "address", "indirizzo", "web"],
  notes: ["notes", "note", "nota", "comments", "comment", "commenti", "extra", "description", "descrizione"],
  totp: ["totp", "otp", "otpauth", "2fa", "mfa", "one-time password", "authenticator", "login_totp"],
  folder: ["folder", "group", "grouping", "category", "categoria", "cartella", "gruppo", "collection", "vault"],
  favorite: ["favorite", "favourite", "fav", "preferito", "starred"],
};

/** Propone una mappatura colonna → campo in base alle intestazioni. */
export function guessCsvMapping(headers: string[]): CsvMapping {
  const taken = new Set<CsvTarget>();
  const columns: CsvTarget[] = headers.map((h) => {
    const k = headerKey(h);
    for (const [target, names] of Object.entries(SYNONYMS) as Array<[CsvTarget, string[]]>) {
      if (!taken.has(target) && names.includes(k)) {
        taken.add(target);
        return target;
      }
    }
    return k ? "field" : "ignore";
  });
  return { columns, headers };
}

/** True se la mappatura identifica almeno un campo utile. */
export function isUsableMapping(m: CsvMapping): boolean {
  return m.columns.some((c) => c === "title" || c === "username" || c === "password" || c === "url");
}

/** CSV qualsiasi con mappatura (indovinata o scelta dall'utente). */
export function parseGenericCsv(text: string, c: Collector, mapping?: CsvMapping): void {
  const table = csvTable(text);
  const m = mapping ?? guessCsvMapping(table.headers);
  if (!isUsableMapping(m)) {
    throw new ImportError("Non riesco a capire le colonne del CSV: indica quale contiene titolo, username, password e URL.", "NEEDS_MAPPING");
  }
  for (const r of table.records) {
    const pick = (t: CsvTarget) => m.columns.map((col, i) => (col === t ? (r.cells[i] ?? "") : "")).filter((v) => v !== "");
    const fields: DraftField[] = [];
    m.columns.forEach((col, i) => {
      if (col === "field") fields.push({ name: m.headers[i] ?? `Colonna ${i + 1}`, value: r.cells[i] ?? "" });
    });
    c.add({
      title: pick("title")[0],
      username: pick("username")[0],
      password: pick("password")[0],
      urls: pick("url").flatMap((u) => u.split(/[\n,]/)),
      notes: pick("notes").join("\n\n"),
      totp: pick("totp")[0],
      folder: pick("folder")[0],
      favorite: truthy(pick("favorite")[0]),
      fields,
    });
  }
}
