// GENERATO da scripts/vendor.mjs — non modificare: modifica packages/ e rilancia `npm run vendor`.
import { cardFields, identityFields, identityTitle, type Collector, type DraftField } from "../normalize.js";
import { csvTable } from "../io.js";
import { ImportError } from "../types.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

const ATTACHMENTS = "Allegati non importati (vanno caricati a mano)";
const PASSKEYS = "Passkey non importate";

/** Bitwarden — export `.json` NON cifrato (personale o di organizzazione). */
export function parseBitwardenJson(text: string, c: Collector): void {
  const data: Json = JSON.parse(text);
  if (data?.encrypted === true) {
    throw new ImportError(
      "L'export di Bitwarden è cifrato. Esporta di nuovo scegliendo il formato «.json» (non «.json (Encrypted)»).",
      "ENCRYPTED_EXPORT",
    );
  }
  if (!Array.isArray(data?.items)) throw new ImportError("File Bitwarden non valido: manca l'elenco «items».", "INVALID_FILE");

  const folders = new Map<string, string>();
  for (const f of data.folders ?? []) folders.set(f.id, f.name);
  for (const f of data.collections ?? []) folders.set(f.id, f.name);

  for (const it of data.items as Json[]) {
    if (it.deletedDate) {
      c.skip();
      continue;
    }
    const folder = folders.get(it.folderId) ?? folders.get(it.collectionIds?.[0]) ?? null;
    const custom: DraftField[] = (it.fields ?? []).map((f: Json) => ({ name: f.name, value: f.value, hidden: f.type === 1 }));
    const history = (it.passwordHistory ?? []).map((h: Json) => ({ password: h.password, date: h.lastUsedDate }));
    if (it.attachments?.length) c.warn(ATTACHMENTS, it.attachments.length);
    const base = { title: it.name, notes: it.notes, favorite: Boolean(it.favorite), folder, history };

    switch (it.type) {
      case 1: {
        const l = it.login ?? {};
        if (l.fido2Credentials?.length) c.warn(PASSKEYS, l.fido2Credentials.length);
        c.add({
          ...base,
          type: "login",
          username: l.username,
          password: l.password,
          urls: (l.uris ?? []).map((u: Json) => u.uri),
          totp: l.totp,
          fields: custom,
        });
        break;
      }
      case 2:
        c.add({ ...base, type: "note", fields: custom });
        break;
      case 3: {
        const k = it.card ?? {};
        c.add({
          ...base,
          type: "card",
          fields: [
            ...cardFields({ holder: k.cardholderName, number: k.number, brand: k.brand, expMonth: k.expMonth, expYear: k.expYear, cvv: k.code }),
            ...custom,
          ],
        });
        break;
      }
      case 4: {
        const i = it.identity ?? {};
        const id = {
          title: i.title,
          first: i.firstName,
          middle: i.middleName,
          last: i.lastName,
          company: i.company,
          email: i.email,
          phone: i.phone,
          address: [i.address1, i.address2, i.address3],
          city: i.city,
          state: i.state,
          zip: i.postalCode,
          country: i.country,
          ssn: i.ssn,
          passport: i.passportNumber,
          license: i.licenseNumber,
        };
        c.add({ ...base, type: "identity", title: it.name || identityTitle(id), username: i.username, fields: [...identityFields(id), ...custom] });
        break;
      }
      case 5: {
        const k = it.sshKey ?? {};
        c.add({
          ...base,
          type: "note",
          fields: [
            { name: "Chiave privata", value: k.privateKey, hidden: true },
            { name: "Chiave pubblica", value: k.publicKey },
            { name: "Impronta", value: k.keyFingerprint },
            ...custom,
          ],
        });
        break;
      }
      default:
        c.skip("Elementi di tipo non riconosciuto ignorati");
    }
  }
}

/** Bitwarden — export `.csv` (solo login e note sicure). */
export function parseBitwardenCsv(text: string, c: Collector): void {
  for (const r of csvTable(text).records) {
    const type = r.get("type").trim().toLowerCase();
    const fields: DraftField[] = r
      .get("fields")
      .split(/\r?\n/)
      .filter((l) => l.trim())
      .map((line) => {
        const idx = line.indexOf(": ");
        return idx >= 0 ? { name: line.slice(0, idx), value: line.slice(idx + 2) } : { name: "Campo", value: line };
      });
    const folder = r.get("folder") || r.get("collections").split(",")[0] || null;
    if (type === "note") {
      c.add({ type: "note", title: r.get("name"), notes: r.get("notes"), fields, favorite: r.get("favorite") === "1", folder });
      continue;
    }
    c.add({
      type: "login",
      title: r.get("name"),
      username: r.get("login_username"),
      password: r.get("login_password"),
      urls: r.get("login_uri").split(","),
      totp: r.get("login_totp"),
      notes: r.get("notes"),
      fields,
      favorite: r.get("favorite") === "1",
      folder,
    });
  }
}
