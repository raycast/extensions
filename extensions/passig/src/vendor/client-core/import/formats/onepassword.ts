// GENERATO da scripts/vendor.mjs — non modificare: modifica packages/ e rilancia `npm run vendor`.
import { decodeText, unzip, zipFind } from "../io.js";
import { cardFields, identityFields, identityTitle, type Collector, type DraftField, type Draft } from "../normalize.js";
import { ImportError } from "../types.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

const CATEGORY = {
  login: "001",
  card: "002",
  note: "003",
  identity: "004",
  password: "005",
  document: "006",
} as const;

/** Data 1Password (epoch in secondi) → `AAAA-MM-GG`. */
function epochDay(v: number): string {
  if (!Number.isFinite(v)) return "";
  return new Date(v * 1000).toISOString().slice(0, 10);
}

interface FieldValue {
  text: string;
  hidden: boolean;
  kind: string;
}

/** Converte il valore tipizzato di un campo 1PUX (`{ concealed: "…" }`, `{ email: {…} }`...). */
function fieldValue(value: Json): FieldValue | null {
  if (!value || typeof value !== "object") return null;
  const kind = Object.keys(value)[0];
  if (!kind) return null;
  const v = value[kind];
  switch (kind) {
    case "concealed":
    case "creditCardNumber":
      return { text: String(v ?? ""), hidden: true, kind };
    case "totp":
      return { text: String(v ?? ""), hidden: true, kind };
    case "email":
      return { text: typeof v === "object" && v ? String(v.email_address ?? "") : String(v ?? ""), hidden: false, kind };
    case "date":
      return { text: typeof v === "number" ? epochDay(v) : "", hidden: false, kind };
    case "monthYear": {
      const s = String(v ?? "");
      return { text: /^\d{6}$/.test(s) ? `${s.slice(4)}/${s.slice(0, 4)}` : s, hidden: false, kind };
    }
    case "address": {
      const a = v ?? {};
      return { text: [a.street, a.city, a.state, a.zip, a.country].filter(Boolean).join(", "), hidden: false, kind };
    }
    case "sshKey":
      return { text: String(v?.privateKey ?? ""), hidden: true, kind };
    case "file":
    case "reference":
      return { text: "", hidden: false, kind };
    default:
      return { text: v === null || v === undefined || typeof v === "object" ? "" : String(v), hidden: false, kind };
  }
}

/** 1Password 8 — export `.1pux` (ZIP con `export.data`). */
export function parseOnePassword1pux(bytes: Uint8Array, c: Collector): void {
  const entries = unzip(bytes);
  const raw = zipFind(entries, "export.data");
  if (!raw) throw new ImportError("File .1pux non valido: manca export.data.", "INVALID_FILE");
  parseOnePasswordExportData(decodeText(raw), c);
  const files = [...entries.keys()].filter((p) => p.startsWith("files/")).length;
  if (files) c.warn("Allegati non importati (vanno caricati a mano)", files);
}

/** Contenuto JSON `export.data` di un 1PUX. */
export function parseOnePasswordExportData(text: string, c: Collector): void {
  const data: Json = JSON.parse(text);
  if (!Array.isArray(data?.accounts)) throw new ImportError("File 1Password non valido: manca «accounts».", "INVALID_FILE");

  for (const account of data.accounts) {
    for (const vault of account.vaults ?? []) {
      const folder: string = vault.attrs?.name ?? null;
      for (const it of vault.items ?? []) {
        const item = it.item ?? it; // alcune versioni annidano l'item
        if (item.state && item.state !== "active" && item.state !== "archived") {
          c.skip();
          continue;
        }
        if (item.state === "archived") c.warn("Elementi archiviati di 1Password importati come normali");
        parseItem(item, folder, c);
      }
    }
  }
}

function parseItem(item: Json, folder: string | null, c: Collector): void {
  const overview = item.overview ?? {};
  const details = item.details ?? {};
  const category: string = item.categoryUuid ?? "";
  let username = "";
  let password = "";
  let totp = "";
  const fields: DraftField[] = [];

  for (const lf of details.loginFields ?? []) {
    if (lf.designation === "username" && !username) username = lf.value ?? "";
    else if (lf.designation === "password" && !password) password = lf.value ?? "";
    else if (lf.value && ["T", "E", "U", "P", "N"].includes(lf.fieldType)) {
      fields.push({ name: lf.name || lf.id || "Campo", value: lf.value, hidden: lf.fieldType === "P" });
    }
  }
  if (!password && details.password) password = details.password;

  // valori di sezione indicizzati per id, per i tipi strutturati
  const byId = new Map<string, FieldValue>();
  const sectionFields: Array<{ id: string; title: string; v: FieldValue }> = [];
  for (const section of details.sections ?? []) {
    for (const f of section.fields ?? []) {
      const v = fieldValue(f.value);
      if (!v) continue;
      if (v.kind === "file") {
        c.warn("Allegati non importati (vanno caricati a mano)");
        continue;
      }
      if (f.id && !byId.has(f.id)) byId.set(f.id, v);
      sectionFields.push({ id: f.id ?? "", title: f.title ?? "", v });
    }
  }
  if (details.passkey) c.warn("Passkey non importate");

  const used = new Set<string>();
  const take = (...ids: string[]) => {
    for (const id of ids) {
      const v = byId.get(id);
      if (v?.text) {
        used.add(id);
        return v.text;
      }
    }
    return "";
  };

  let type: Draft["type"] = "login";
  let structured: DraftField[] = [];
  let title: string = overview.title ?? "";

  if (category === CATEGORY.card) {
    type = "card";
    structured = cardFields({
      holder: take("cardholder"),
      number: take("ccnum"),
      brand: take("type"),
      expiry: take("expiry"),
      cvv: take("cvv"),
      pin: take("pin"),
    });
  } else if (category === CATEGORY.identity) {
    type = "identity";
    const addr = byId.get("address");
    let address: string[] = [];
    let city = "", state = "", zip = "", country = "";
    if (addr) {
      used.add("address");
      // ricostruisce i componenti dall'oggetto originale
      for (const section of details.sections ?? []) {
        for (const f of section.fields ?? []) {
          if (f.id === "address" && f.value?.address) {
            const a = f.value.address;
            address = [a.street];
            city = a.city ?? "";
            state = a.state ?? "";
            zip = a.zip ?? "";
            country = a.country ?? "";
          }
        }
      }
    }
    const id = {
      first: take("firstname"),
      middle: take("initial"),
      last: take("lastname"),
      company: take("company"),
      email: take("email"),
      phone: take("defphone", "cellphone", "homephone", "busphone"),
      address,
      city,
      state,
      zip,
      country,
      birth: take("birthdate"),
    };
    if (!username) username = take("username");
    structured = identityFields(id);
    if (!title) title = identityTitle(id);
  } else if (category === CATEGORY.note) {
    type = "note";
  } else if (category === CATEGORY.document) {
    type = "note";
    c.warn("Documenti di 1Password importati senza il file allegato");
  } else if (category !== CATEGORY.login && category !== CATEGORY.password) {
    // licenze, conti bancari, server, database, Wi-Fi, chiavi SSH, API...
    if (!username) username = take("username");
    if (!password) password = take("password", "credential");
    type = username || password ? "login" : "note";
  }

  for (const f of sectionFields) {
    if (f.id && used.has(f.id)) continue;
    if (f.v.kind === "totp" && !totp) {
      totp = f.v.text;
      continue;
    }
    fields.push({ name: f.title || f.id || "Campo", value: f.v.text, hidden: f.v.hidden });
  }

  const urls: string[] = [];
  if (overview.url) urls.push(overview.url);
  for (const u of overview.urls ?? []) if (u?.url) urls.push(u.url);

  c.add({
    type,
    title,
    username,
    password,
    urls,
    notes: details.notesPlain,
    totp,
    fields: [...structured, ...fields],
    favorite: Number(item.favIndex) > 0,
    history: (details.passwordHistory ?? []).map((h: Json) => ({ password: h.value, date: h.time })),
    folder,
  });
}
