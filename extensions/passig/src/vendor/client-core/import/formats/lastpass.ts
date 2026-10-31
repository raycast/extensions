// GENERATED from packages/ by the Passig monorepo — do not edit by hand.
import { csvTable } from "../io.js";
import { cardFields, identityFields, identityTitle, truthy, type Collector, type DraftField } from "../normalize.js";

/** Chiavi "segrete" nelle note strutturate di LastPass: diventano campi nascosti. */
const SECRET_KEY = /password|passphrase|pin|security code|cvv|number|numero|secret|key|chiave/i;

/** Le note strutturate di LastPass: `NoteType:Credit Card\nChiave:Valore\n...\nNotes:testo libero`. */
function parseNoteType(extra: string): { noteType: string; values: Map<string, string>; notes: string } | null {
  if (!extra.startsWith("NoteType:")) return null;
  const lines = extra.replace(/\r\n?/g, "\n").split("\n");
  const values = new Map<string, string>();
  let notes = "";
  let noteType = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx);
    const value = line.slice(idx + 1);
    if (key === "NoteType") noteType = value.trim();
    else if (key === "Notes") {
      notes = [value, ...lines.slice(i + 1)].join("\n");
      break;
    } else if (key !== "Language") values.set(key, value);
  }
  return { noteType, values, notes };
}

/** Il telefono di LastPass è un JSON `{"num":"…","ext":"…","cc3l":"…"}`. */
function phone(v: string | undefined): string {
  if (!v) return "";
  try {
    const o = JSON.parse(v) as { num?: string; ext?: string };
    return [o.num, o.ext ? `int. ${o.ext}` : ""].filter(Boolean).join(" ");
  } catch {
    return v;
  }
}

function take(values: Map<string, string>, key: string): string {
  const v = values.get(key) ?? "";
  values.delete(key);
  return v;
}

function rest(values: Map<string, string>): DraftField[] {
  return [...values.entries()].map(([name, value]) => ({ name, value, hidden: SECRET_KEY.test(name) }));
}

/** LastPass CSV: `url,username,password,totp,extra,name,grouping,fav`. */
export function parseLastPassCsv(text: string, c: Collector): void {
  for (const r of csvTable(text).records) {
    const url = r.get("url");
    const extra = r.get("extra");
    const folder = r.get("grouping");
    const favorite = truthy(r.get("fav"));
    const title = r.get("name");

    if (url === "http://sn") {
      const s = parseNoteType(extra);
      if (!s) {
        c.add({ type: "note", title, notes: extra, folder, favorite });
        continue;
      }
      const v = s.values;
      if (s.noteType === "Credit Card") {
        const fields = cardFields({
          holder: take(v, "Name on Card"),
          brand: take(v, "Type"),
          number: take(v, "Number"),
          cvv: take(v, "Security Code"),
          expiry: take(v, "Expiration Date"),
        });
        c.add({ type: "card", title, notes: s.notes, folder, favorite, fields: [...fields, ...rest(v)] });
      } else if (s.noteType === "Address") {
        const id = {
          title: take(v, "Title"),
          first: take(v, "First Name"),
          middle: take(v, "Middle Name"),
          last: take(v, "Last Name"),
          company: take(v, "Company"),
          email: take(v, "Email Address"),
          phone: phone(take(v, "Phone")),
          address: [take(v, "Address 1"), take(v, "Address 2"), take(v, "Address 3")],
          city: take(v, "City / Town"),
          state: take(v, "State"),
          zip: take(v, "Zip / Postal Code"),
          country: take(v, "Country"),
          birth: take(v, "Birthday"),
        };
        const username = take(v, "Username");
        for (const k of ["Evening Phone", "Mobile Phone", "Fax"]) if (v.has(k)) v.set(k, phone(v.get(k)));
        c.add({ type: "identity", title: title || identityTitle(id), username, notes: s.notes, folder, favorite, fields: [...identityFields(id), ...rest(v)] });
      } else {
        // altri tipi (conto bancario, passaporto, Wi-Fi, server, database...): nota con campi
        const username = take(v, "Username");
        const password = take(v, "Password");
        const hostname = take(v, "Hostname");
        const isLogin = Boolean(username || password);
        const fields: DraftField[] = [{ name: "Tipo", value: s.noteType }, ...rest(v)];
        c.add({
          type: isLogin ? "login" : "note",
          title,
          username,
          password,
          urls: hostname ? [hostname] : [],
          notes: s.notes,
          folder,
          favorite,
          fields,
        });
      }
      continue;
    }

    c.add({
      type: "login",
      title,
      urls: url === "http://" || url === "https://" ? [] : [url],
      username: r.get("username"),
      password: r.get("password"),
      totp: r.get("totp"),
      notes: extra,
      folder,
      favorite,
    });
  }
}
