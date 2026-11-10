// GENERATED from packages/ by the Passig monorepo — do not edit by hand.
/**
 * Normalizzazione comune a tutti i formati: ogni parser produce delle `Draft`
 * "grezze" e il `Collector` le trasforma in `ItemData` validi secondo le regole
 * documentate in docs/import/FORMATS.md §2 (le stesse implementate in Swift e Dart).
 */
import { ItemData } from "../../shared/index.js";

type ItemType = ItemData["type"];
import type { ImportFormatId, ImportResult, ImportedItem } from "./types.js";

export interface DraftField {
  name: string;
  value: string | number | boolean | null | undefined;
  hidden?: boolean;
}

export interface DraftHistory {
  password: string | null | undefined;
  date?: string | number | null;
}

export interface Draft {
  type?: ItemType;
  title?: string | null;
  username?: string | null;
  password?: string | null;
  urls?: Array<string | null | undefined>;
  notes?: string | null;
  totp?: string | null;
  fields?: DraftField[];
  favorite?: boolean;
  history?: DraftHistory[];
  folder?: string | null;
}

export const LIMITS = {
  title: 200,
  username: 500,
  password: 5000,
  url: 2000,
  notes: 50_000,
  totp: 2000,
  fieldName: 100,
  fieldValue: 10_000,
  history: 20,
} as const;

/** Nomi italiani dei campi per carte e identità (coerenti con gli editor delle app). */
export const CARD_FIELDS = {
  holder: "Titolare",
  number: "Numero carta",
  brand: "Circuito",
  expiry: "Scadenza",
  cvv: "CVV",
  pin: "PIN",
} as const;

export const IDENTITY_FIELDS = {
  title: "Titolo",
  first: "Nome",
  middle: "Secondo nome",
  last: "Cognome",
  fullName: "Nome completo",
  company: "Azienda",
  email: "Email",
  phone: "Telefono",
  address: "Indirizzo",
  city: "Città",
  state: "Provincia",
  zip: "CAP",
  country: "Paese",
  birth: "Data di nascita",
  ssn: "Codice fiscale / SSN",
  passport: "Passaporto",
  license: "Patente",
} as const;

const str = (v: unknown): string => (v === null || v === undefined ? "" : typeof v === "string" ? v : String(v));
const crlf = (s: string) => s.replace(/\r\n?/g, "\n");

/** Aggiunge https:// agli URL senza schema che sembrano un host (es. `github.com/login`). */
export function normalizeImportUrl(raw: string): string {
  const u = raw.trim();
  if (!u) return "";
  if (u.includes("://")) return u;
  // schemi senza "//" (mailto:, android:, ...) ma non "host:porta"
  if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(u)) return u;
  if (/^[^\s/:?#]+(:\d+)?([/?#].*)?$/.test(u)) {
    const host = u.split(/[/:?#]/)[0]!.toLowerCase();
    if (host.includes(".") || host === "localhost") return `https://${u}`;
  }
  return u;
}

/** Hostname di un URL (senza `www.`), per i titoli di ripiego. */
export function hostOf(url: string): string {
  const m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)/i.exec(url);
  if (!m) return "";
  let host = m[1]!;
  const at = host.lastIndexOf("@");
  if (at >= 0) host = host.slice(at + 1);
  host = host.replace(/:\d*$/, "").toLowerCase();
  return host.startsWith("www.") ? host.slice(4) : host;
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  gennaio: 1, febbraio: 2, marzo: 3, aprile: 4, maggio: 5, giugno: 6, luglio: 7, agosto: 8, settembre: 9, ottobre: 10, novembre: 11, dicembre: 12,
};

function fmtExpiry(month: number, year: number): string {
  const y = year < 100 ? 2000 + year : year;
  return `${String(month).padStart(2, "0")}/${y}`;
}

/**
 * Normalizza una scadenza carta in `MM/AAAA`. Accetta mese e anno separati oppure
 * una stringa: `MM/AA`, `MM/AAAA`, `MM-AAAA`, `AAAA-MM`, `AAAAMM`, `Mese,AAAA`.
 * Se non riconosciuta restituisce la stringa originale.
 */
export function normalizeExpiry(raw?: string | number | null, month?: string | number | null, year?: string | number | null): string {
  const m = Number.parseInt(str(month).trim(), 10);
  const y = Number.parseInt(str(year).trim(), 10);
  if (m >= 1 && m <= 12 && y > 0) return fmtExpiry(m, y);
  const s = str(raw).trim();
  if (!s) {
    if (m >= 1 && m <= 12) return String(m).padStart(2, "0");
    return y > 0 ? String(y < 100 ? 2000 + y : y) : "";
  }
  let r: RegExpExecArray | null;
  if ((r = /^(\d{1,2})\s*[/\-.]\s*(\d{2}|\d{4})$/.exec(s))) {
    const mm = +r[1]!;
    if (mm >= 1 && mm <= 12) return fmtExpiry(mm, +r[2]!);
  }
  if ((r = /^(\d{4})\s*[/\-.]\s*(\d{1,2})$/.exec(s))) {
    const mm = +r[2]!;
    if (mm >= 1 && mm <= 12) return fmtExpiry(mm, +r[1]!);
  }
  if ((r = /^(\d{4})(\d{2})$/.exec(s))) {
    const mm = +r[2]!;
    if (mm >= 1 && mm <= 12) return fmtExpiry(mm, +r[1]!);
  }
  if ((r = /^([a-zà-ù]+)[\s,/]+(\d{2}|\d{4})$/i.exec(s))) {
    const mm = MONTHS[r[1]!.toLowerCase()];
    if (mm) return fmtExpiry(mm, +r[2]!);
  }
  return s;
}

export interface CardInput {
  holder?: unknown;
  number?: unknown;
  brand?: unknown;
  expiry?: string | number | null;
  expMonth?: string | number | null;
  expYear?: string | number | null;
  cvv?: unknown;
  pin?: unknown;
}

/** Campi standard di una carta, nell'ordine canonico. */
export function cardFields(c: CardInput): DraftField[] {
  return [
    { name: CARD_FIELDS.holder, value: str(c.holder) },
    { name: CARD_FIELDS.number, value: str(c.number).replace(/\s+/g, ""), hidden: true },
    { name: CARD_FIELDS.brand, value: str(c.brand) },
    { name: CARD_FIELDS.expiry, value: normalizeExpiry(c.expiry, c.expMonth, c.expYear) },
    { name: CARD_FIELDS.cvv, value: str(c.cvv), hidden: true },
    { name: CARD_FIELDS.pin, value: str(c.pin), hidden: true },
  ];
}

export interface IdentityInput {
  title?: unknown;
  first?: unknown;
  middle?: unknown;
  last?: unknown;
  fullName?: unknown;
  company?: unknown;
  email?: unknown;
  phone?: unknown;
  address?: unknown[];
  city?: unknown;
  state?: unknown;
  zip?: unknown;
  country?: unknown;
  birth?: unknown;
  ssn?: unknown;
  passport?: unknown;
  license?: unknown;
}

/** Campi standard di un'identità, nell'ordine canonico. */
export function identityFields(i: IdentityInput): DraftField[] {
  const hasSplitName = [i.first, i.middle, i.last].some((v) => str(v).trim());
  return [
    { name: IDENTITY_FIELDS.title, value: str(i.title) },
    { name: IDENTITY_FIELDS.first, value: str(i.first) },
    { name: IDENTITY_FIELDS.middle, value: str(i.middle) },
    { name: IDENTITY_FIELDS.last, value: str(i.last) },
    { name: IDENTITY_FIELDS.fullName, value: hasSplitName ? "" : str(i.fullName) },
    { name: IDENTITY_FIELDS.company, value: str(i.company) },
    { name: IDENTITY_FIELDS.email, value: str(i.email) },
    { name: IDENTITY_FIELDS.phone, value: str(i.phone) },
    {
      name: IDENTITY_FIELDS.address,
      value: (i.address ?? []).map((a) => str(a).trim()).filter(Boolean).join(", "),
    },
    { name: IDENTITY_FIELDS.city, value: str(i.city) },
    { name: IDENTITY_FIELDS.state, value: str(i.state) },
    { name: IDENTITY_FIELDS.zip, value: str(i.zip) },
    { name: IDENTITY_FIELDS.country, value: str(i.country) },
    { name: IDENTITY_FIELDS.birth, value: str(i.birth) },
    { name: IDENTITY_FIELDS.ssn, value: str(i.ssn), hidden: true },
    { name: IDENTITY_FIELDS.passport, value: str(i.passport), hidden: true },
    { name: IDENTITY_FIELDS.license, value: str(i.license), hidden: true },
  ];
}

/** Titolo suggerito per un'identità: nome e cognome o nome completo. */
export function identityTitle(i: IdentityInput): string {
  const split = [i.first, i.last].map((v) => str(v).trim()).filter(Boolean).join(" ");
  return split || str(i.fullName).trim();
}

/** Converte una data (ISO, epoch in secondi o millisecondi) in ISO 8601 UTC con millisecondi. */
export function toIsoDate(v: string | number | null | undefined): string | null {
  if (v === null || v === undefined || v === "") return null;
  let ms: number;
  if (typeof v === "number" || /^\d+(\.\d+)?$/.test(v)) {
    const n = Number(v);
    ms = n < 1e11 ? n * 1000 : n;
  } else {
    ms = Date.parse(v);
  }
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return new Date(Math.round(ms)).toISOString();
}

/** Interpreta i valori booleani dei CSV ("1", "true", "yes", "sì", "x"). */
export function truthy(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  return ["1", "true", "yes", "y", "si", "sì", "x", "on"].includes(str(v).trim().toLowerCase());
}

/** Normalizza un percorso cartella: separatore "/", niente slash iniziali/finali o vuoti. */
export function normalizeFolder(v: string | null | undefined): string | null {
  const parts = str(v)
    .split(/[/\\]/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts.join("/") : null;
}

export interface CollectorOptions {
  /** Istante usato per le voci di cronologia senza data (default: adesso). */
  now?: Date;
}

/** Accumula gli item normalizzati, gli scarti e gli avvisi aggregati. */
export class Collector {
  readonly items: ImportedItem[] = [];
  skipped = 0;
  private warnings = new Map<string, number>();
  private readonly nowIso: string;

  constructor(opts: CollectorOptions = {}) {
    this.nowIso = (opts.now ?? new Date()).toISOString();
  }

  /** Registra un avviso; i messaggi uguali vengono aggregati con un conteggio. */
  warn(message: string, count = 1): void {
    this.warnings.set(message, (this.warnings.get(message) ?? 0) + count);
  }

  skip(reason?: string): void {
    this.skipped++;
    if (reason) this.warn(reason);
  }

  add(d: Draft): void {
    const type: ItemType = d.type ?? "login";
    const rawTitle = str(d.title).trim();
    let username = str(d.username).trim();
    let password = str(d.password);
    if (!password.trim()) password = "";
    let notes = crlf(str(d.notes)).trim();
    let totp: string | undefined = str(d.totp).trim() || undefined;

    const urls: string[] = [];
    for (const raw of d.urls ?? []) {
      const u = normalizeImportUrl(str(raw));
      if (!u) continue;
      if (u.length > LIMITS.url) {
        this.warn("URL troppo lunghi ignorati");
        continue;
      }
      if (!urls.includes(u)) urls.push(u);
    }

    const fields: ItemData["fields"] = [];
    for (const f of d.fields ?? []) {
      const hidden = Boolean(f.hidden);
      let value = crlf(str(f.value));
      if (!hidden) value = value.trim();
      if (!value.trim()) continue;
      if (value.length > LIMITS.fieldValue) {
        value = value.slice(0, LIMITS.fieldValue);
        this.warn("Campi personalizzati troncati a 10.000 caratteri");
      }
      const name = (str(f.name).trim() || "Campo").slice(0, LIMITS.fieldName);
      fields.push({ name, value, hidden });
    }

    if (!rawTitle && !username && !password && !urls.length && !notes && !fields.length && !totp) {
      this.skip();
      return;
    }

    if (password.length > LIMITS.password) {
      this.skip("Elementi con password oltre 5.000 caratteri non importati");
      return;
    }
    if (username.length > LIMITS.username) {
      username = username.slice(0, LIMITS.username);
      this.warn("Username troncati a 500 caratteri");
    }
    if (notes.length > LIMITS.notes) {
      notes = notes.slice(0, LIMITS.notes);
      this.warn("Note troncate a 50.000 caratteri");
    }
    if (totp && totp.length > LIMITS.totp) {
      totp = undefined;
      this.warn("Segreti TOTP non validi ignorati");
    }

    let title = rawTitle;
    if (!title && type === "card") {
      const num = fields.find((f) => f.name === CARD_FIELDS.number)?.value ?? "";
      title = num.length >= 4 ? `Carta •••• ${num.slice(-4)}` : "Carta";
    }
    if (!title) title = (urls[0] && hostOf(urls[0])) || username || "Senza titolo";
    title = title.slice(0, LIMITS.title);

    const history: ItemData["passwordHistory"] = [];
    for (const h of d.history ?? []) {
      const pw = str(h.password);
      if (!pw.trim() || pw === password || pw.length > LIMITS.password) continue;
      if (history.some((x) => x.password === pw)) continue;
      history.push({ password: pw, changedAt: toIsoDate(h.date ?? null) ?? this.nowIso });
      if (history.length >= LIMITS.history) break;
    }

    const data = ItemData.parse({
      v: 1,
      type,
      title,
      username,
      password,
      urls,
      notes,
      ...(totp ? { totp } : {}),
      fields,
      favorite: Boolean(d.favorite),
      passwordHistory: history,
    });
    this.items.push({ folder: normalizeFolder(d.folder), data });
  }

  result(format: ImportFormatId): ImportResult {
    const warnings = [...this.warnings.entries()].map(([m, n]) => (n > 1 ? `${m} (${n})` : m));
    return { format, items: this.items, skipped: this.skipped, warnings };
  }
}
