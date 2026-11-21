// GENERATED from packages/ by the Passig monorepo — do not edit by hand.
/** Formati CSV "piatti": browser, 1Password, KeePass/KeePassXC, RoboForm, NordPass, Proton Pass, Keeper. */
import { csvTable, parseCsv } from "../io.js";
import { cardFields, identityFields, identityTitle, truthy, type Collector, type DraftField } from "../normalize.js";

/** Chrome, Edge, Brave, Opera, Vivaldi, Arc: `name,url,username,password[,note]`. */
export function parseChromeCsv(text: string, c: Collector): void {
  for (const r of csvTable(text).records) {
    c.add({ title: r.get("name"), urls: [r.get("url")], username: r.get("username"), password: r.get("password"), notes: r.get("note", "notes") });
  }
}

/** Firefox: `url,username,password,httpRealm,formActionOrigin,guid,...`. */
export function parseFirefoxCsv(text: string, c: Collector): void {
  for (const r of csvTable(text).records) {
    const url = r.get("url");
    if (url.startsWith("chrome://")) {
      c.skip(); // credenziali interne di Firefox (es. account Firefox)
      continue;
    }
    c.add({ urls: [url], username: r.get("username"), password: r.get("password"), history: [] });
  }
}

/** Safari / app Password di Apple: `Title,URL,Username,Password,Notes,OTPAuth`. */
export function parseSafariCsv(text: string, c: Collector): void {
  for (const r of csvTable(text).records) {
    c.add({
      title: r.get("title"),
      urls: [r.get("url")],
      username: r.get("username"),
      password: r.get("password"),
      notes: r.get("notes"),
      totp: r.get("otpauth"),
    });
  }
}

/** 1Password 8 CSV: `Title,Url,Username,Password,OTPAuth,Favorite,Archived,Tags,Notes`. */
export function parseOnePasswordCsv(text: string, c: Collector): void {
  for (const r of csvTable(text).records) {
    const tags = r.get("tags");
    c.add({
      title: r.get("title"),
      urls: r.get("url", "website", "urls").split(/[\n,]/),
      username: r.get("username"),
      password: r.get("password"),
      totp: r.get("otpauth", "one-time password"),
      notes: r.get("notes", "notesplain"),
      favorite: truthy(r.get("favorite")),
      fields: tags ? [{ name: "Tag", value: tags }] : [],
    });
  }
}

/** KeePassXC CSV: `Group,Title,Username,Password,URL,Notes,TOTP,Icon,Last Modified,Created`. */
export function parseKeePassXcCsv(text: string, c: Collector): void {
  for (const r of csvTable(text).records) {
    // il primo segmento del gruppo è la radice del database ("Root")
    const group = r.get("group").split("/").slice(1).join("/");
    c.add({
      title: r.get("title"),
      username: r.get("username"),
      password: r.get("password"),
      urls: [r.get("url")],
      notes: r.get("notes"),
      totp: r.get("totp"),
      folder: group,
    });
  }
}

/** KeePass 2 CSV: `Account,Login Name,Password,Web Site,Comments`. */
export function parseKeePassCsv(text: string, c: Collector): void {
  for (const r of csvTable(text).records) {
    c.add({
      title: r.get("account"),
      username: r.get("login name"),
      password: r.get("password"),
      urls: [r.get("web site")],
      notes: r.get("comments"),
    });
  }
}

/** RoboForm: `Name,Url,MatchUrl,Login,Pwd,Note,Folder,RfFieldsV2`. */
export function parseRoboFormCsv(text: string, c: Collector): void {
  for (const r of csvTable(text).records) {
    c.add({
      title: r.get("name"),
      urls: [r.get("url", "matchurl")],
      username: r.get("login"),
      password: r.get("pwd"),
      notes: r.get("note"),
      folder: r.get("folder"),
    });
  }
}

function parseJsonArray(s: string): unknown[] {
  if (!s.trim()) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** NordPass CSV (password, note, carte, identità; le righe "folder" sono solo cartelle). */
export function parseNordPassCsv(text: string, c: Collector): void {
  for (const r of csvTable(text).records) {
    const type = r.get("type").toLowerCase();
    if (type === "folder") continue;
    const custom: DraftField[] = parseJsonArray(r.get("custom_fields")).map((f) => {
      const o = f as { label?: string; type?: string; value?: string };
      return { name: o.label ?? "", value: o.value, hidden: o.type === "hidden" };
    });
    const base = { title: r.get("name"), notes: r.get("note"), folder: r.get("folder") };
    if (type === "note") {
      c.add({ ...base, type: "note", fields: custom });
    } else if (type === "credit_card") {
      c.add({
        ...base,
        type: "card",
        fields: [
          ...cardFields({ holder: r.get("cardholdername"), number: r.get("cardnumber"), cvv: r.get("cvc"), pin: r.get("pin"), expiry: r.get("expirydate") }),
          ...custom,
        ],
      });
    } else if (type === "identity") {
      const id = {
        fullName: r.get("full_name"),
        email: r.get("email"),
        phone: r.get("phone_number"),
        address: [r.get("address1"), r.get("address2")],
        city: r.get("city"),
        state: r.get("state"),
        zip: r.get("zipcode"),
        country: r.get("country"),
      };
      c.add({ ...base, type: "identity", title: base.title || identityTitle(id), fields: [...identityFields(id), ...custom] });
    } else {
      const extra = parseJsonArray(r.get("additional_urls")).map(String);
      c.add({ ...base, type: "login", urls: [r.get("url"), ...extra], username: r.get("username") || r.get("email"), password: r.get("password"), fields: custom });
    }
  }
}

/** Proton Pass CSV: `type,name,url,email,username,password,note,totp,createTime,modifyTime,vault`. */
export function parseProtonPassCsv(text: string, c: Collector): void {
  for (const r of csvTable(text).records) {
    const type = r.get("type").toLowerCase();
    const username = r.get("username");
    const email = r.get("email");
    const fields: DraftField[] = username && email && email !== username ? [{ name: "Email", value: email }] : [];
    c.add({
      type: type === "note" ? "note" : "login",
      title: r.get("name"),
      urls: r.get("url").split(","),
      username: username || email,
      password: r.get("password"),
      notes: r.get("note"),
      totp: r.get("totp"),
      fields,
      folder: r.get("vault"),
    });
  }
}

/**
 * Keeper CSV (senza intestazione): `Cartella, Titolo, Login, Password, URL, Note,
 * Cartella condivisa, [nome campo, valore]...`. Il campo `TFC:Keeper` è il TOTP.
 */
export function parseKeeperCsv(text: string, c: Collector): void {
  for (const row of parseCsv(text)) {
    const [folder = "", title = "", login = "", password = "", url = "", notes = "", shared = "", ...rest] = row;
    if (row.length >= 5 && title.trim().toLowerCase() === "title" && login.trim().toLowerCase() === "login") continue; // eventuale intestazione
    let totp = "";
    const fields: DraftField[] = [];
    for (let i = 0; i + 1 < rest.length; i += 2) {
      const name = rest[i]!;
      const value = rest[i + 1]!;
      if (name === "TFC:Keeper") totp = value;
      else fields.push({ name, value });
    }
    c.add({
      title,
      username: login,
      password,
      urls: [url],
      notes,
      totp,
      fields,
      folder: [shared, folder].filter((s) => s.trim()).join("/"),
    });
  }
}
