// GENERATO da scripts/vendor.mjs — non modificare: modifica packages/ e rilancia `npm run vendor`.
import type { ItemData } from "../../shared/index.js";

/** Formati di import supportati. L'id è stabile: è usato anche da Swift/Dart e nelle fixture. */
export type ImportFormatId =
  | "bitwarden-json"
  | "bitwarden-csv"
  | "1password-1pux"
  | "1password-csv"
  | "lastpass-csv"
  | "chrome-csv"
  | "firefox-csv"
  | "safari-csv"
  | "keepass-xml"
  | "keepassxc-csv"
  | "keepass-csv"
  | "dashlane-csv"
  | "keeper-json"
  | "keeper-csv"
  | "nordpass-csv"
  | "protonpass-json"
  | "protonpass-csv"
  | "enpass-json"
  | "roboform-csv"
  | "generic-csv";

export interface ImportFormatInfo {
  id: ImportFormatId;
  /** Nome dell'app di provenienza, per la UI. */
  source: string;
  /** Etichetta del formato (es. "JSON non cifrato"). */
  label: string;
  /** Estensioni accettate (con il punto). */
  extensions: string[];
  /** Istruzioni brevi su come esportare dall'app di origine. */
  howTo: string;
}

/** Un elemento pronto da cifrare, con la cartella di origine (percorso "A/B") se presente. */
export interface ImportedItem {
  folder: string | null;
  data: ItemData;
}

export interface ImportResult {
  format: ImportFormatId;
  items: ImportedItem[];
  /** Elementi di origine scartati (vuoti, nel cestino, non validi). */
  skipped: number;
  /** Avvisi leggibili, già aggregati (es. "3 allegati non importati"). */
  warnings: string[];
}

/** File in ingresso: nome (per l'estensione) e contenuto grezzo. */
export interface ImportFile {
  name: string;
  bytes: Uint8Array;
}

/** Campi di destinazione per la mappatura manuale delle colonne di un CSV generico. */
export type CsvTarget = "title" | "username" | "password" | "url" | "notes" | "totp" | "folder" | "favorite" | "field" | "ignore";

export interface CsvMapping {
  /** Per ogni colonna (indice) il campo di destinazione. */
  columns: CsvTarget[];
  /** Nome della colonna, usato come nome del campo personalizzato per i target "field". */
  headers: string[];
}

export class ImportError extends Error {
  constructor(
    message: string,
    readonly code:
      | "UNKNOWN_FORMAT"
      | "ENCRYPTED_EXPORT"
      | "INVALID_FILE"
      | "EMPTY"
      | "NEEDS_MAPPING",
  ) {
    super(message);
    this.name = "ImportError";
  }
}
