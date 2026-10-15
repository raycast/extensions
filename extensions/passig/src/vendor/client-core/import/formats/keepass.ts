// GENERATO da scripts/vendor.mjs — non modificare: modifica packages/ e rilancia `npm run vendor`.
import { parseXml, xmlChild, xmlChildren, xmlText, type XmlNode } from "../io.js";
import type { Collector, DraftField, DraftHistory } from "../normalize.js";
import { ImportError } from "../types.js";

const STANDARD = new Set(["Title", "UserName", "Password", "URL", "Notes"]);
const TOTP_KEYS = ["otp", "TOTP Seed", "TimeOtp-Secret-Base32"];
/** Campi tecnici dei plugin TOTP che non servono più una volta importato il segreto. */
const TOTP_SETTINGS = new Set(["TOTP Settings", "TimeOtp-Length", "TimeOtp-Period", "TimeOtp-Algorithm"]);

function entryStrings(entry: XmlNode): Map<string, { value: string; secret: boolean }> {
  const map = new Map<string, { value: string; secret: boolean }>();
  for (const s of xmlChildren(entry, "String")) {
    const valueNode = xmlChild(s, "Value");
    const secret = valueNode?.attrs.ProtectInMemory === "True" || valueNode?.attrs.Protected === "True";
    map.set(xmlText(s, "Key"), { value: valueNode?.text ?? "", secret });
  }
  return map;
}

/** KeePass 2.x — "Esporta → KeePass XML (2.x)" (anche KeePassXC / KeeWeb / Strongbox). */
export function parseKeePassXml(text: string, c: Collector): void {
  const doc = parseXml(text);
  const kp = xmlChild(doc, "KeePassFile");
  const rootGroup = xmlChild(xmlChild(kp, "Root"), "Group");
  if (!kp || !rootGroup) throw new ImportError("File XML di KeePass non valido.", "INVALID_FILE");
  const meta = xmlChild(kp, "Meta");
  const recycleEnabled = xmlText(meta, "RecycleBinEnabled") !== "False";
  const recycleUuid = recycleEnabled ? xmlText(meta, "RecycleBinUUID") : "";
  let protectedWarn = false;

  const countEntries = (g: XmlNode): number =>
    xmlChildren(g, "Entry").length + xmlChildren(g, "Group").reduce((n, sub) => n + countEntries(sub), 0);

  const walk = (group: XmlNode, path: string[]) => {
    for (const entry of xmlChildren(group, "Entry")) {
      const strings = entryStrings(entry);
      const get = (k: string) => strings.get(k)?.value ?? "";
      if (xmlChildren(entry, "String").some((s) => xmlChild(s, "Value")?.attrs.Protected === "True")) {
        protectedWarn = true;
      }
      let totp = "";
      for (const k of TOTP_KEYS) {
        if (!totp && get(k)) totp = get(k);
      }
      const fields: DraftField[] = [];
      for (const [key, s] of strings) {
        if (STANDARD.has(key) || TOTP_KEYS.includes(key) || TOTP_SETTINGS.has(key)) continue;
        fields.push({ name: key, value: s.value, hidden: s.secret });
      }
      const history: DraftHistory[] = xmlChildren(xmlChild(entry, "History"), "Entry")
        .map((h) => ({ password: entryStrings(h).get("Password")?.value ?? "", date: xmlText(xmlChild(h, "Times"), "LastModificationTime") || null }))
        .reverse(); // KeePass le salva dalla più vecchia alla più recente
      const binaries = xmlChildren(entry, "Binary").length;
      if (binaries) c.warn("Allegati non importati (vanno caricati a mano)", binaries);
      c.add({
        type: "login",
        title: get("Title"),
        username: get("UserName"),
        password: get("Password"),
        urls: [get("URL")],
        notes: get("Notes"),
        totp,
        fields,
        history,
        folder: path.join("/"),
      });
    }
    for (const sub of xmlChildren(group, "Group")) {
      if (recycleUuid && xmlText(sub, "UUID") === recycleUuid) {
        for (let i = countEntries(sub); i > 0; i--) c.skip();
        continue;
      }
      walk(sub, [...path, xmlText(sub, "Name")]);
    }
  };
  // il gruppo radice (nome del database) non diventa una cartella
  walk(rootGroup, []);
  if (protectedWarn) {
    c.warn("Il file contiene valori protetti: usa «Esporta → KeePass XML (2.x)» e non il file interno del database");
  }
}
