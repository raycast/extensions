// GENERATED from packages/ by the Passig monorepo — do not edit by hand.
/** Formati JSON/ZIP: Dashlane, Keeper, Proton Pass, Enpass. */
import { csvTable, decodeText, isZip, unzip, zipFind } from "../io.js";
import { cardFields, identityFields, identityTitle, truthy, type Collector, type DraftField } from "../normalize.js";
import { ImportError } from "../types.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

const ATTACHMENTS = "Allegati non importati (vanno caricati a mano)";
const PASSKEYS = "Passkey non importate";

// ---------------------------------------------------------------- Dashlane

/** Dashlane: ZIP con `credentials.csv`, `securenotes.csv`, `payments.csv`, `ids.csv`, `personalInfo.csv` (o uno solo dei CSV). */
export function parseDashlane(file: { name: string; bytes: Uint8Array }, c: Collector): void {
  const parts = new Map<string, string>();
  if (isZip(file.bytes)) {
    const entries = unzip(file.bytes);
    for (const name of ["credentials.csv", "securenotes.csv", "payments.csv", "ids.csv", "personalInfo.csv"]) {
      const b = zipFind(entries, name);
      if (b) parts.set(name.toLowerCase(), decodeText(b));
    }
  } else {
    const text = decodeText(file.bytes);
    const base = file.name.split(/[/\\]/).pop()!.toLowerCase();
    const known = ["credentials.csv", "securenotes.csv", "payments.csv", "ids.csv", "personalinfo.csv"];
    parts.set(known.includes(base) ? base : "credentials.csv", text);
  }
  if (!parts.size) throw new ImportError("Nessun CSV di Dashlane trovato nello ZIP.", "INVALID_FILE");

  const credentials = parts.get("credentials.csv");
  if (credentials) {
    for (const r of csvTable(credentials).records) {
      const usernames = [r.get("username"), r.get("username2"), r.get("username3")].filter(Boolean);
      const otp = r.get("otpurl", "otpsecret");
      c.add({
        title: r.get("title"),
        username: usernames[0],
        password: r.get("password"),
        urls: [r.get("url")],
        notes: r.get("note"),
        totp: otp,
        fields: usernames.slice(1).map((u, i) => ({ name: `Username ${i + 2}`, value: u })),
        folder: r.get("category"),
      });
    }
  }
  const notes = parts.get("securenotes.csv");
  if (notes) {
    for (const r of csvTable(notes).records) c.add({ type: "note", title: r.get("title"), notes: r.get("note"), folder: r.get("category") });
  }
  const payments = parts.get("payments.csv");
  if (payments) {
    for (const r of csvTable(payments).records) {
      const title = r.get("name", "account_name");
      if (r.get("type") === "bank") {
        c.add({
          type: "note",
          title,
          notes: r.get("note"),
          fields: [
            { name: "Intestatario", value: r.get("account_holder") },
            { name: "Banca", value: r.get("issuing_bank") },
            { name: "IBAN / Numero conto", value: r.get("account_number"), hidden: true },
            { name: "BIC / Routing", value: r.get("routing_number") },
            { name: "Paese", value: r.get("country") },
          ],
        });
      } else {
        c.add({
          type: "card",
          title,
          notes: r.get("note"),
          fields: cardFields({
            holder: r.get("account_holder"),
            number: r.get("cc_number"),
            cvv: r.get("code"),
            expMonth: r.get("expiration_month"),
            expYear: r.get("expiration_year"),
          }),
        });
      }
    }
  }
  const ids = parts.get("ids.csv");
  if (ids) {
    for (const r of csvTable(ids).records) {
      c.add({
        type: "identity",
        title: r.get("name") || r.get("type"),
        fields: [
          { name: "Documento", value: r.get("type") },
          { name: "Numero", value: r.get("number"), hidden: true },
          { name: "Intestatario", value: r.get("name") },
          { name: "Rilasciato il", value: r.get("issue_date") },
          { name: "Scadenza", value: r.get("expiration_date") },
          { name: "Luogo di rilascio", value: r.get("place_of_issue") },
          { name: "Stato", value: r.get("state") },
        ],
      });
    }
  }
  const personal = parts.get("personalinfo.csv");
  if (personal) {
    for (const r of csvTable(personal).records) {
      const id = {
        title: r.get("title"),
        first: r.get("first_name"),
        middle: r.get("middle_name"),
        last: r.get("last_name"),
        email: r.get("email"),
        phone: r.get("phone_number"),
        address: [r.get("address")],
        city: r.get("city"),
        state: r.get("state"),
        zip: r.get("zip"),
        country: r.get("country"),
        birth: r.get("date_of_birth"),
      };
      c.add({ type: "identity", title: r.get("item_name") || identityTitle(id), username: r.get("login"), fields: identityFields(id) });
    }
  }
}

// ---------------------------------------------------------------- Keeper

const KEEPER_TYPES: Record<string, string> = {
  pinCode: "PIN",
  secret: "Segreto",
  email: "Email",
  phone: "Telefono",
  url: "URL",
  text: "Testo",
  multiline: "Testo",
  date: "Data",
  birthDate: "Data di nascita",
  accountNumber: "Numero conto",
  securityQuestion: "Domanda di sicurezza",
};

/** Nome leggibile di una chiave `custom_fields` di Keeper (`$tipo:etichetta::1` → `etichetta`). */
function keeperLabel(key: string): string {
  const k = key.replace(/::\d+$/, "");
  const m = /^\$([^:]+)(?::(.*))?$/.exec(k);
  if (!m) return k;
  return m[2] || KEEPER_TYPES[m[1]!] || m[1]!;
}

function keeperValue(v: Json): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.map(keeperValue).filter(Boolean).join(", ");
  if (typeof v === "object") {
    if ("number" in v) return String(v.number ?? "");
    return Object.values(v).map(keeperValue).filter(Boolean).join(" ");
  }
  return String(v);
}

/** Keeper — export JSON. */
export function parseKeeperJson(text: string, c: Collector): void {
  const data: Json = JSON.parse(text);
  if (!Array.isArray(data?.records)) throw new ImportError("File Keeper non valido: manca «records».", "INVALID_FILE");
  for (const rec of data.records) {
    const custom: Record<string, Json> = { ...(rec.custom_fields ?? {}) };
    const takeKey = (pred: (k: string) => boolean): Json => {
      const key = Object.keys(custom).find(pred);
      if (key === undefined) return undefined;
      const v = custom[key];
      delete custom[key];
      return v;
    };
    const totp = keeperValue(takeKey((k) => k === "TFC:Keeper" || k.startsWith("$oneTimeCode")));
    const f0 = rec.folders?.[0];
    const folder = f0 ? [f0.shared_folder, f0.folder].filter(Boolean).join("/") : null;
    const type: string = rec.$type ?? "login";
    const structured: DraftField[] = [];
    let itemType: "login" | "note" | "card" | "identity" = "login";
    let title: string = rec.title ?? "";

    if (type === "bankCard") {
      itemType = "card";
      const card = takeKey((k) => k.startsWith("$paymentCard")) ?? {};
      const holder = keeperValue(takeKey((k) => k.toLowerCase().startsWith("$text:cardholder") || k.startsWith("$name")));
      structured.push(
        ...cardFields({ holder, number: card.cardNumber, expiry: card.cardExpirationDate, cvv: card.cardSecurityCode, pin: keeperValue(takeKey((k) => k.startsWith("$pinCode"))) }),
      );
    } else if (type === "contact" || type === "address" || type === "ssnCard" || type === "driverLicense" || type === "passport") {
      itemType = "identity";
      const name = takeKey((k) => k.startsWith("$name")) ?? {};
      const addr = takeKey((k) => k.startsWith("$address")) ?? {};
      const id = {
        first: name.first,
        middle: name.middle,
        last: name.last,
        company: keeperValue(takeKey((k) => k.toLowerCase().startsWith("$text:company"))),
        email: keeperValue(takeKey((k) => k.startsWith("$email"))),
        phone: keeperValue(takeKey((k) => k.startsWith("$phone"))),
        address: [addr.street1, addr.street2],
        city: addr.city,
        state: addr.state,
        zip: addr.zip,
        country: addr.country,
        birth: keeperValue(takeKey((k) => k.startsWith("$birthDate"))),
        ssn: keeperValue(takeKey((k) => k.startsWith("$accountNumber:identityNumber"))),
      };
      structured.push(...identityFields(id));
      if (!title) title = identityTitle(id);
    } else if (type === "encryptedNotes" || (!rec.login && !rec.password && !rec.login_url)) {
      itemType = "note";
    }
    const fields: DraftField[] = Object.entries(custom).map(([k, v]) => ({
      name: keeperLabel(k),
      value: keeperValue(v),
      hidden: /^\$(secret|pinCode|securityQuestion|password)/.test(k),
    }));
    if (rec.attachments?.length) c.warn(ATTACHMENTS, rec.attachments.length);
    c.add({
      type: itemType,
      title,
      username: rec.login,
      password: rec.password,
      urls: [rec.login_url],
      notes: rec.notes,
      totp,
      fields: [...structured, ...fields],
      folder,
    });
  }
}

// ---------------------------------------------------------------- Proton Pass

/** Proton Pass — export JSON non cifrato (`data.json`, anche dentro lo ZIP). */
export function parseProtonPass(file: { name: string; bytes: Uint8Array }, c: Collector): void {
  let text: string;
  if (isZip(file.bytes)) {
    const raw = zipFind(unzip(file.bytes), "data.json");
    if (!raw) throw new ImportError("ZIP di Proton Pass non valido: manca data.json.", "INVALID_FILE");
    text = decodeText(raw);
  } else {
    text = decodeText(file.bytes);
  }
  const data: Json = JSON.parse(text);
  if (data?.encrypted === true) {
    throw new ImportError("L'export di Proton Pass è cifrato con PGP. Esporta di nuovo senza cifratura (ZIP o JSON).", "ENCRYPTED_EXPORT");
  }
  if (!data?.vaults || typeof data.vaults !== "object") throw new ImportError("File Proton Pass non valido: manca «vaults».", "INVALID_FILE");

  for (const vault of Object.values<Json>(data.vaults)) {
    for (const it of vault.items ?? []) {
      if (it.state === 2) {
        c.skip(); // cestino
        continue;
      }
      const d = it.data ?? {};
      const meta = d.metadata ?? {};
      const content = d.content ?? {};
      let totp = "";
      const extra: DraftField[] = [];
      for (const f of d.extraFields ?? []) {
        const value = f.data?.content ?? f.data?.totpUri ?? "";
        if (f.type === "totp" && !totp) totp = value;
        else extra.push({ name: f.fieldName, value, hidden: f.type === "hidden" || f.type === "totp" });
      }
      const base = { title: meta.name, notes: meta.note, favorite: Boolean(it.pinned), folder: vault.name as string };
      switch (d.type) {
        case "login": {
          if (content.passkeys?.length) c.warn(PASSKEYS, content.passkeys.length);
          const user = content.itemUsername ?? content.username ?? "";
          const email = content.itemEmail ?? "";
          const fields: DraftField[] = user && email ? [{ name: "Email", value: email }] : [];
          c.add({
            ...base,
            type: "login",
            username: user || email,
            password: content.password,
            urls: content.urls ?? [],
            totp: content.totpUri || totp,
            fields: [...fields, ...extra],
          });
          break;
        }
        case "alias":
          c.add({ ...base, type: "login", username: it.aliasEmail, fields: [{ name: "Tipo", value: "Alias email Proton" }, ...extra] });
          break;
        case "note":
          c.add({ ...base, type: "note", fields: extra, totp });
          break;
        case "creditCard":
          c.add({
            ...base,
            type: "card",
            fields: [
              ...cardFields({
                holder: content.cardholderName,
                number: content.number,
                cvv: content.verificationNumber,
                expiry: content.expirationDate,
                pin: content.pin,
              }),
              ...extra,
            ],
          });
          break;
        case "identity": {
          const id = {
            first: content.firstName,
            middle: content.middleName,
            last: content.lastName,
            fullName: content.fullName,
            company: content.organization || content.company,
            email: content.email,
            phone: content.phoneNumber,
            address: [content.streetAddress],
            city: content.city,
            state: content.stateOrProvince,
            zip: content.zipOrPostalCode,
            country: content.countryOrRegion,
            birth: content.birthdate,
            ssn: content.socialSecurityNumber,
            passport: content.passportNumber,
            license: content.licenseNumber,
          };
          c.add({ ...base, type: "identity", title: meta.name || identityTitle(id), fields: [...identityFields(id), ...extra] });
          break;
        }
        default:
          c.skip("Elementi di tipo non riconosciuto ignorati");
      }
    }
  }
}

// ---------------------------------------------------------------- Enpass

/** Enpass 6 — export JSON. */
export function parseEnpassJson(text: string, c: Collector): void {
  const data: Json = JSON.parse(text);
  if (!Array.isArray(data?.items)) throw new ImportError("File Enpass non valido: manca «items».", "INVALID_FILE");
  const folders = new Map<string, Json>();
  for (const f of data.folders ?? []) folders.set(f.uuid, f);
  const folderPath = (uuid: string | undefined): string | null => {
    const parts: string[] = [];
    let cur = uuid ? folders.get(uuid) : undefined;
    for (let guard = 0; cur && guard < 20; guard++) {
      parts.unshift(cur.title);
      cur = cur.parent_uuid ? folders.get(cur.parent_uuid) : undefined;
    }
    return parts.length ? parts.join("/") : null;
  };

  for (const it of data.items) {
    if (truthy(it.trashed)) {
      c.skip();
      continue;
    }
    if (it.attachments?.length) c.warn(ATTACHMENTS, it.attachments.length);
    const category: string = it.category ?? "login";
    let username = "";
    let password = "";
    let totp = "";
    const urls: string[] = [];
    const card: Record<string, string> = {};
    const fields: DraftField[] = [];
    for (const f of it.fields ?? []) {
      if (truthy(f.deleted) || f.type === "section") continue;
      const value: string = f.value ?? "";
      if (!value) continue;
      const hidden = truthy(f.sensitive);
      if (f.type === "username" && !username) username = value;
      else if (f.type === "email" && !username) username = value;
      else if (f.type === "password" && !password) password = value;
      else if (f.type === "url") urls.push(value);
      else if (f.type === "totp" && !totp) totp = value;
      else if (category === "creditcard" && /^cc(Name|Number|Cvc|Expiry|Pin|Type)$/.test(f.type) && !card[f.type]) card[f.type] = value;
      else fields.push({ name: f.label, value, hidden });
    }
    let type: "login" | "note" | "card" | "identity";
    let structured: DraftField[] = [];
    if (category === "creditcard") {
      type = "card";
      structured = cardFields({ holder: card.ccName, number: card.ccNumber, cvv: card.ccCvc, expiry: card.ccExpiry, pin: card.ccPin, brand: card.ccType });
    } else if (category === "note") type = "note";
    else if (category === "identity") type = "identity";
    else type = category === "login" || category === "password" || username || password ? "login" : "note";

    c.add({
      type,
      title: it.title,
      username,
      password,
      urls,
      notes: it.note,
      totp,
      fields: [...structured, ...fields],
      favorite: truthy(it.favorite),
      folder: folderPath(it.folders?.[0]),
    });
  }
}
