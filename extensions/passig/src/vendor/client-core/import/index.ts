// GENERATED from packages/ by the Passig monorepo — do not edit by hand.
/**
 * Import da altri password manager — tutto avviene SUL CLIENT: il file viene
 * letto e convertito in `ItemData` in memoria, poi cifrato con la vaultKey e
 * inviato al server con `POST /vaults/:id/items/bulk`. Il server non vede mai
 * il contenuto in chiaro (zero-knowledge).
 *
 * Specifica dei formati e delle regole di normalizzazione: docs/import/FORMATS.md.
 * Le stesse regole sono implementate in Swift (macOS) e Dart (Flutter) e
 * verificate con le fixture condivise in docs/import/fixtures.
 */
import { decodeText, csvTable, headerKey, isZip, unzip } from "./io.js";
import { Collector, type CollectorOptions } from "./normalize.js";
import { parseBitwardenCsv, parseBitwardenJson } from "./formats/bitwarden.js";
import {
  parseChromeCsv,
  parseFirefoxCsv,
  parseKeePassCsv,
  parseKeePassXcCsv,
  parseKeeperCsv,
  parseNordPassCsv,
  parseOnePasswordCsv,
  parseProtonPassCsv,
  parseRoboFormCsv,
  parseSafariCsv,
} from "./formats/csv-simple.js";
import { parseGenericCsv } from "./formats/generic.js";
import { parseDashlane, parseEnpassJson, parseKeeperJson, parseProtonPass } from "./formats/json-others.js";
import { parseKeePassXml } from "./formats/keepass.js";
import { parseLastPassCsv } from "./formats/lastpass.js";
import { parseOnePassword1pux, parseOnePasswordExportData } from "./formats/onepassword.js";
import { ImportError, type CsvMapping, type ImportFile, type ImportFormatId, type ImportFormatInfo, type ImportResult } from "./types.js";

export * from "./types.js";
export { guessCsvMapping, isUsableMapping } from "./formats/generic.js";
export { CARD_FIELDS, IDENTITY_FIELDS, normalizeExpiry, normalizeImportUrl } from "./normalize.js";
export { parseCsv, decodeText } from "./io.js";
export * from "./plan.js";

/** Catalogo dei formati, nell'ordine in cui mostrarli nella UI. */
export const IMPORT_FORMATS: ImportFormatInfo[] = [
  { id: "bitwarden-json", source: "Bitwarden", label: "JSON", extensions: [".json"], howTo: "Strumenti → Esporta cassaforte → formato «.json» (non cifrato)." },
  { id: "bitwarden-csv", source: "Bitwarden", label: "CSV", extensions: [".csv"], howTo: "Strumenti → Esporta cassaforte → formato «.csv»." },
  { id: "1password-1pux", source: "1Password", label: "1PUX", extensions: [".1pux"], howTo: "App desktop: File → Esporta → seleziona l'account → formato 1PUX." },
  { id: "1password-csv", source: "1Password", label: "CSV", extensions: [".csv"], howTo: "App desktop: File → Esporta → formato CSV." },
  { id: "lastpass-csv", source: "LastPass", label: "CSV", extensions: [".csv"], howTo: "Estensione: Account → Avanzate → Esporta (oppure lastpass.com → Opzioni avanzate → Esporta)." },
  { id: "chrome-csv", source: "Chrome / Edge / Brave / Opera", label: "CSV", extensions: [".csv"], howTo: "Impostazioni → Gestore password → Impostazioni → Esporta password." },
  { id: "firefox-csv", source: "Firefox", label: "CSV", extensions: [".csv"], howTo: "about:logins → menu ⋯ → Esporta password." },
  { id: "safari-csv", source: "Safari / Password di Apple", label: "CSV", extensions: [".csv"], howTo: "App Password (o Safari → Impostazioni → Password) → File → Esporta tutte le password." },
  { id: "keepass-xml", source: "KeePass / KeePassXC", label: "XML", extensions: [".xml"], howTo: "File → Esporta → KeePass XML (2.x). Il file .kdbx è cifrato e non si può importare direttamente." },
  { id: "keepassxc-csv", source: "KeePassXC", label: "CSV", extensions: [".csv"], howTo: "Database → Esporta → File CSV." },
  { id: "keepass-csv", source: "KeePass 2", label: "CSV", extensions: [".csv"], howTo: "File → Esporta → KeePass CSV (1.x)." },
  { id: "dashlane-csv", source: "Dashlane", label: "ZIP/CSV", extensions: [".zip", ".csv"], howTo: "App web: Impostazioni → Esporta dati → CSV (si ottiene uno ZIP: importalo così com'è)." },
  { id: "keeper-json", source: "Keeper", label: "JSON", extensions: [".json"], howTo: "Web Vault: Impostazioni → Esporta → JSON." },
  { id: "keeper-csv", source: "Keeper", label: "CSV", extensions: [".csv"], howTo: "Web Vault: Impostazioni → Esporta → CSV." },
  { id: "nordpass-csv", source: "NordPass", label: "CSV", extensions: [".csv"], howTo: "Impostazioni → Esporta elementi → CSV." },
  { id: "protonpass-json", source: "Proton Pass", label: "ZIP/JSON", extensions: [".zip", ".json"], howTo: "Impostazioni → Esporta → Proton Pass (ZIP) senza cifratura PGP." },
  { id: "protonpass-csv", source: "Proton Pass", label: "CSV", extensions: [".csv"], howTo: "Impostazioni → Esporta → CSV." },
  { id: "enpass-json", source: "Enpass", label: "JSON", extensions: [".json"], howTo: "File → Esporta → formato .json." },
  { id: "roboform-csv", source: "RoboForm", label: "CSV", extensions: [".csv"], howTo: "Opzioni → Account e dati → Esporta → CSV." },
  { id: "generic-csv", source: "Altro (CSV generico)", label: "CSV", extensions: [".csv", ".txt"], howTo: "Qualsiasi CSV con intestazione: scegli tu a quale campo corrisponde ogni colonna." },
];

export function importFormatInfo(id: ImportFormatId): ImportFormatInfo {
  return IMPORT_FORMATS.find((f) => f.id === id)!;
}

const KDBX_MAGIC = [0x03, 0xd9, 0xa2, 0x9a];

function hasAll(headers: Set<string>, ...names: string[]): boolean {
  return names.every((n) => headers.has(n));
}

/** Riconosce il formato di un CSV dalle intestazioni. */
export function detectCsvFormat(text: string): ImportFormatId {
  const h = new Set(csvTable(text.slice(0, 64 * 1024)).headers.map(headerKey));
  if (hasAll(h, "login_uri", "login_username")) return "bitwarden-csv";
  if (hasAll(h, "url", "username", "password", "extra", "name", "grouping")) return "lastpass-csv";
  if (hasAll(h, "url", "username", "password", "httprealm", "formactionorigin")) return "firefox-csv";
  if (hasAll(h, "type", "name", "url", "email", "username", "password", "vault")) return "protonpass-csv";
  if (hasAll(h, "name", "url", "username", "password", "cardholdername", "cardnumber")) return "nordpass-csv";
  if (hasAll(h, "username", "username2", "title", "password", "url")) return "dashlane-csv";
  if (hasAll(h, "title", "note") && h.size <= 3 && h.has("category")) return "dashlane-csv";
  if (hasAll(h, "name", "url", "matchurl", "login", "pwd")) return "roboform-csv";
  if (hasAll(h, "group", "title", "username", "password", "url", "notes")) return "keepassxc-csv";
  if (hasAll(h, "account", "login name", "password", "web site")) return "keepass-csv";
  if (hasAll(h, "title", "url", "username", "password", "otpauth") && (h.has("archived") || h.has("tags") || h.has("favorite"))) return "1password-csv";
  if (hasAll(h, "title", "url", "username", "password")) return "safari-csv";
  if (hasAll(h, "name", "url", "username", "password")) return "chrome-csv";
  return "generic-csv";
}

/** Riconosce automaticamente il formato di un file di export. */
export function detectFormat(file: ImportFile): ImportFormatId {
  const b = file.bytes;
  const name = file.name.toLowerCase();
  if (!b.length) throw new ImportError("Il file è vuoto.", "EMPTY");
  if (KDBX_MAGIC.every((v, i) => b[i] === v)) {
    throw new ImportError("Questo è un database KeePass cifrato (.kdbx). In KeePass usa File → Esporta → KeePass XML (2.x).", "ENCRYPTED_EXPORT");
  }
  if (name.endsWith(".1pux")) return "1password-1pux";
  if (isZip(b)) {
    const paths = [...unzip(b).keys()].map((p) => p.split("/").pop()!.toLowerCase());
    if (paths.includes("export.data")) return "1password-1pux";
    if (paths.includes("credentials.csv") || paths.includes("securenotes.csv") || paths.includes("payments.csv")) return "dashlane-csv";
    if (paths.includes("data.json")) return "protonpass-json";
    throw new ImportError("Archivio ZIP non riconosciuto.", "UNKNOWN_FORMAT");
  }
  if (name.endsWith(".pgp") || name.endsWith(".gpg")) {
    throw new ImportError("L'export è cifrato con PGP: esportalo di nuovo senza cifratura.", "ENCRYPTED_EXPORT");
  }
  const text = decodeText(b).trimStart();
  if (text.startsWith("{") || text.startsWith("[")) {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      throw new ImportError("Il file JSON non è valido.", "INVALID_FILE");
    }
    if (data && typeof data === "object") {
      if (data.vaults && typeof data.vaults === "object" && ("userId" in data || "version" in data)) return "protonpass-json";
      if (Array.isArray(data.accounts)) return "1password-1pux";
      if (Array.isArray(data.records)) return "keeper-json";
      if ("encrypted" in data && ("passwordProtected" in data || "encKeyValidation_DO_NOT_EDIT" in data || Array.isArray(data.items))) return "bitwarden-json";
      const items = data.items as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(items)) {
        const first = items[0] ?? {};
        if (typeof first.type === "number") return "bitwarden-json";
        if ("category" in first || "fields" in first) return "enpass-json";
      }
    }
    throw new ImportError("File JSON non riconosciuto.", "UNKNOWN_FORMAT");
  }
  if (text.startsWith("<")) {
    if (text.slice(0, 4096).includes("<KeePassFile")) return "keepass-xml";
    throw new ImportError("File XML non riconosciuto.", "UNKNOWN_FORMAT");
  }
  return detectCsvFormat(text);
}

export interface ParseImportOptions extends CollectorOptions {
  /** Forza un formato invece del riconoscimento automatico. */
  format?: ImportFormatId;
  /** Mappatura delle colonne per `generic-csv` (se assente viene indovinata). */
  mapping?: CsvMapping;
}

/** Legge un file di export e lo converte in item Passig (in chiaro, solo in memoria). */
export function parseImport(file: ImportFile, opts: ParseImportOptions = {}): ImportResult {
  const format = opts.format ?? detectFormat(file);
  const c = new Collector(opts);
  const text = () => decodeText(file.bytes);
  try {
    switch (format) {
      case "bitwarden-json":
        parseBitwardenJson(text(), c);
        break;
      case "bitwarden-csv":
        parseBitwardenCsv(text(), c);
        break;
      case "1password-1pux":
        if (isZip(file.bytes)) parseOnePassword1pux(file.bytes, c);
        else parseOnePasswordExportData(text(), c);
        break;
      case "1password-csv":
        parseOnePasswordCsv(text(), c);
        break;
      case "lastpass-csv":
        parseLastPassCsv(text(), c);
        break;
      case "chrome-csv":
        parseChromeCsv(text(), c);
        break;
      case "firefox-csv":
        parseFirefoxCsv(text(), c);
        break;
      case "safari-csv":
        parseSafariCsv(text(), c);
        break;
      case "keepass-xml":
        parseKeePassXml(text(), c);
        break;
      case "keepassxc-csv":
        parseKeePassXcCsv(text(), c);
        break;
      case "keepass-csv":
        parseKeePassCsv(text(), c);
        break;
      case "dashlane-csv":
        parseDashlane(file, c);
        break;
      case "keeper-json":
        parseKeeperJson(text(), c);
        break;
      case "keeper-csv":
        parseKeeperCsv(text(), c);
        break;
      case "nordpass-csv":
        parseNordPassCsv(text(), c);
        break;
      case "protonpass-json":
        parseProtonPass(file, c);
        break;
      case "protonpass-csv":
        parseProtonPassCsv(text(), c);
        break;
      case "enpass-json":
        parseEnpassJson(text(), c);
        break;
      case "roboform-csv":
        parseRoboFormCsv(text(), c);
        break;
      case "generic-csv":
        parseGenericCsv(text(), c, opts.mapping);
        break;
    }
  } catch (err) {
    if (err instanceof ImportError) throw err;
    if (err instanceof SyntaxError) throw new ImportError(`Il file non è nel formato atteso (${importFormatInfo(format).source}).`, "INVALID_FILE");
    throw new ImportError(`Errore durante la lettura del file: ${err instanceof Error ? err.message : String(err)}`, "INVALID_FILE");
  }
  const result = c.result(format);
  if (!result.items.length && !result.skipped) throw new ImportError("Nessun elemento trovato nel file.", "EMPTY");
  return result;
}

/** Anteprima di un CSV per la mappatura manuale: intestazioni e prime righe. */
export function previewCsv(file: ImportFile, rows = 5): { headers: string[]; rows: string[][] } {
  const table = csvTable(decodeText(file.bytes));
  return { headers: table.headers, rows: table.records.slice(0, rows).map((r) => r.cells) };
}
