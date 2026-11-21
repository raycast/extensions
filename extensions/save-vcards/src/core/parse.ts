// Turns raw text plus the helper's on-device detections into a contact draft.
// Pure functions, no Raycast imports, so it runs under `npm test`.

// Shape returned by the Swift side (detectCore in swift/Sources/ContactsCore.swift).
export type Detection = {
  emails: string[];
  phones: { number: string; location: number; length: number }[];
  urls: string[];
  addresses: {
    raw: string;
    street: string;
    postalCode: string;
    city: string;
    country: string;
  }[];
  people: string[];
  orgs: string[];
};

type ParseOptions = {
  /** Calling code used to turn national numbers ("0664 …") into international ones, e.g. "43". Empty: leave as typed. */
  defaultCallingCode?: string;
};

export type Labeled = { value: string; label: string };

export type Address = {
  street: string;
  postalCode: string;
  city: string;
  country: string;
};

export type ContactDraft = {
  namePrefix: string;
  givenName: string;
  familyName: string;
  nameSuffix: string;
  organization: string;
  jobTitle: string;
  emails: Labeled[];
  phones: Labeled[];
  urls: Labeled[];
  address: Address | null;
};

// ---------- vocabularies ----------

const PREFIX_TITLES = [
  "univ.-prof.",
  "prof.",
  "ddr.",
  "dr.",
  "mmag.",
  "mag.a",
  "mag.",
  "dipl.-ing.",
  "dipl.-kfm.",
  "di",
  "ing.",
  "bakk.",
];
const SUFFIX_TITLES = ["mba", "msc", "bsc", "ba", "ma", "phd", "ll.m.", "llm", "mas", "mes", "cpa", "cfa"];

const ROLE_WORDS = [
  "ceo",
  "cto",
  "coo",
  "cfo",
  "cmo",
  "cpo",
  "cio",
  "founder",
  "co-founder",
  "cofounder",
  "gründer",
  "gründerin",
  "geschäftsführer",
  "geschäftsführerin",
  "geschäftsführung",
  "managing director",
  "managing partner",
  "head of",
  "leiter",
  "leiterin",
  "leitung",
  "manager",
  "managerin",
  "director",
  "direktor",
  "direktorin",
  "partner",
  "partnerin",
  "inhaber",
  "inhaberin",
  "owner",
  "president",
  "vp",
  "vice president",
  "vorstand",
  "vorständin",
  "prokurist",
  "prokuristin",
  "consultant",
  "berater",
  "beraterin",
  "engineer",
  "developer",
  "entwickler",
  "entwicklerin",
  "designer",
  "assistant",
  "assistenz",
  "sales",
  "vertrieb",
  "marketing",
  "account executive",
  "specialist",
  "lead",
  "officer",
  "chairman",
  "board",
  "referent",
  "referentin",
  "sachbearbeiter",
  "sachbearbeiterin",
  "steuerberater",
  "steuerberaterin",
  "rechtsanwalt",
  "rechtsanwältin",
  "notar",
  "notarin",
  "makler",
  "maklerin",
  "agent",
  "recruiter",
  "analyst",
  "architekt",
  "architektin",
  "architect",
];

const LEGAL_FORM =
  /(\bGmbH\b|\bAG\b|\bKG\b|\bOG\b|\be\.\s?U\.|\bSE\b|\bLtd\b\.?|\bInc\b\.?|\bLLC\b|\bS\.A\.|\bs\.r\.o\.|\bB\.V\.|\be\.V\.|\bm\.b\.H\.|\bKEG\b|\bGesmbH\b|\bGes\.m\.b\.H\.|\bPLC\b|\bCorp\b\.?|\bS\.?p\.?A\.?)/i;

const FREEMAIL = new Set([
  "gmail.com",
  "googlemail.com",
  "gmx.at",
  "gmx.de",
  "gmx.net",
  "web.de",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "live.at",
  "yahoo.com",
  "yahoo.de",
  "icloud.com",
  "me.com",
  "mac.com",
  "aon.at",
  "chello.at",
  "a1.net",
  "proton.me",
  "protonmail.com",
  "t-online.de",
  "posteo.de",
  "posteo.at",
]);

const GENERIC_LOCAL = new Set([
  "office",
  "info",
  "hello",
  "hi",
  "contact",
  "kontakt",
  "mail",
  "team",
  "sales",
  "support",
  "admin",
  "service",
  "buero",
  "büro",
  "noreply",
  "no-reply",
  "kanzlei",
  "einkauf",
  "rechnung",
  "billing",
  "jobs",
  "presse",
  "press",
]);

// ---------- helpers ----------

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").toLowerCase();

const titleCase = (s: string) => s.replace(/(^|[\s-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());

// LinkedIn and email-signature noise that sits on the same line as a name.
function cleanLine(line: string): string {
  return line
    .replace(/[•·]\s*(1st|2nd|3rd\+?|1\.|2\.|3\.\+?)\b/gi, "")
    .replace(/\((she|he|they|sie|er)\/[^)]*\)/gi, "")
    .replace(/(?:✓|✔\uFE0F?|☑)/gu, "")
    .replace(/^[\s\-–—_*>|]{1,40}/, "")
    .replace(/[\s\-–—_*>|]{1,40}$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function hasRoleWord(line: string): boolean {
  const l = fold(line);
  return ROLE_WORDS.some((w) => new RegExp(`(^|[^\\p{L}])${fold(w)}([^\\p{L}]|$)`, "u").test(l));
}

function looksLikeName(line: string): boolean {
  const { core } = splitTitles(line);
  if (!core || core.length > 40) return false;
  if (/[\d@/:]|www\.|\.(at|de|com|ch)\b/i.test(core)) return false;
  if (LEGAL_FORM.test(core) || hasRoleWord(core)) return false;
  const words = core.replace(",", " ").split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 4) return false;
  const particles = new Set(["von", "van", "der", "de", "zu", "di", "da", "del", "la", "le"]);
  return words.every((w) => particles.has(w.toLowerCase()) || /^\p{Lu}[\p{L}'’.-]*$/u.test(w));
}

// "Mag. Dr. Anna Maria Huber, MBA" -> prefix "Mag. Dr.", core "Anna Maria Huber", suffix "MBA"
function splitTitles(line: string): {
  prefix: string;
  core: string;
  suffix: string;
} {
  let rest = cleanLine(line);
  const prefixes: string[] = [];
  const suffixes: string[] = [];

  for (let changed = true; changed;) {
    changed = false;
    for (const t of PREFIX_TITLES) {
      const m = rest.match(new RegExp(`^${t.replace(/[.-]/g, (c) => "\\" + c)}(\\s+|$)`, "i"));
      if (m) {
        prefixes.push(rest.slice(0, t.length));
        rest = rest.slice(m[0].length);
        changed = true;
        break;
      }
    }
  }

  // Trailing post-nominals, with or without a comma: "Anna Huber, MBA, MSc" / "Anna Huber BSc"
  for (let changed = true; changed;) {
    changed = false;
    const m = rest.match(/[,\s]+([A-Za-z.]{2,6})\.?$/);
    if (m && SUFFIX_TITLES.includes(m[1].toLowerCase().replace(/\.$/, ""))) {
      suffixes.unshift(m[1]);
      rest = rest.slice(0, m.index).trim();
      changed = true;
    }
  }
  return {
    prefix: prefixes.join(" "),
    core: rest.replace(/,\s*$/, "").trim(),
    suffix: suffixes.join(", "),
  };
}

function splitName(core: string): { given: string; family: string } {
  if (core.includes(",")) {
    const [family, given] = core.split(",").map((s) => s.trim());
    return { given, family };
  }
  const words = core.split(/\s+/);
  if (words.length === 1) return { given: words[0], family: "" };
  // Family name keeps its particles: "Ursula von der Leyen" -> given "Ursula", family "von der Leyen"
  const particles = new Set(["von", "van", "der", "de", "zu", "di", "da", "del", "la", "le"]);
  let i = words.length - 1;
  while (i > 1 && particles.has(words[i - 1].toLowerCase())) i--;
  return {
    given: words.slice(0, i).join(" "),
    family: words.slice(i).join(" "),
  };
}

// `before` is the text on the same line in front of the number; only what follows the
// previous number counts, so "T +43 1 234  M +43 664 ..." labels each one separately.
function phoneLabel(beforeOnLine: string, number: string): string {
  const before = fold(beforeOnLine).replace(/^.*\d/, "");
  if (/\b(fax|f)\b\.?/.test(before)) return "fax";
  if (/\b(m|mob|mobil|mobile|handy|cell|cel)\b\.?/.test(before)) return "mobile";
  if (/\b(t|tel|telefon|phone|fon|office|festnetz|direct|direkt|dw)\b\.?/.test(before)) return "work";
  const digits = number.replace(/[^\d+]/g, "").replace(/^00/, "+");
  if (/^(\+436|06)\d/.test(digits)) return "mobile"; // Austria
  if (/^(\+491[5-7]|01[5-7])\d/.test(digits)) return "mobile"; // Germany
  if (/^(\+417[5-9]|07[5-9])\d/.test(digits)) return "mobile"; // Switzerland
  return "work";
}

function fallbackAddress(lines: string[]): Address | null {
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/(?:^|,\s*|\s)(?:(A|D|CH)-)?(\d{4,5})\s+(\p{Lu}[\p{L} .-]+?)(?:,\s*(.+))?$/u);
    if (!m) continue;
    const before = lines[i].slice(0, m.index).replace(/,\s*$/, "").trim();
    // "4020 Linz, Hauptplatz 5": what follows the city is the street when it has a number.
    const after = m[4]?.trim() ?? "";
    const afterIsStreet = /\d/.test(after);
    const street =
      before || (afterIsStreet ? after : "") || (i > 0 && /\d/.test(lines[i - 1]) ? lines[i - 1].trim() : "");
    const country =
      (afterIsStreet ? "" : after) || { A: "Österreich", D: "Deutschland", CH: "Schweiz" }[m[1] ?? ""] || "";
    return { street, postalCode: m[2], city: m[3].trim(), country };
  }
  return null;
}

// ---------- phone numbers ----------

/**
 * "0664 123 45 67" -> "+43 664 123 45 67" (with calling code "43"), "0043 1 234" -> "+43 1 234",
 * "+43 (0) 1 234" -> "+43 1 234". Numbers that already carry a country code keep it.
 * Stored internationally so the iPhone matches incoming calls from any country.
 */
const NO_TRUNK_DIGITS: Record<string, number> = { "1": 10, "34": 9 };

export function normalizePhone(raw: string, callingCode: string): string {
  let n = raw
    .trim()
    .replace(/\(0\)\s*/, "")
    .replace(/[^\d+()\s/.-]/g, "");
  // "(0664) 123 4567" -> "0664 123 4567"; US-style "(415) 555-0199" stays as written below.
  n = n.replace(/^\((0\d+)\)/, "$1");
  n = n.replace(/[/.]/g, " ").replace(/\s+/g, " ").trim();
  if (n.startsWith("00")) return "+" + n.slice(2).replace(/^\s+/, "");
  if (n.startsWith("+")) return n;
  if (!callingCode) return n;
  // Countries without a trunk 0 write national numbers with a fixed number of digits:
  // US/Canada "415 555 0199" (10, or 11 with a leading 1), Spain "612 345 678" (9).
  const national = NO_TRUNK_DIGITS[callingCode];
  if (national) {
    const d = n.replace(/\D/g, "");
    if (d.length === national) return `+${callingCode} ${n.replace(/[()]/g, "").trim()}`.replace(/\s+/g, " ");
    if (callingCode === "1" && d.length === 11 && d.startsWith("1"))
      return `+1 ${n
        .replace(/[()]/g, "")
        .replace(/^1[\s-]*/, "")
        .trim()}`.replace(/\s+/g, " ");
    return n;
  }
  if (/^0[1-9]/.test(n)) {
    // Italy, San Marino and Vatican City keep the leading 0 after the country code.
    const keepZero = ["39", "378", "379"].includes(callingCode);
    return `+${callingCode} ${keepZero ? n : n.slice(1)}`.replace(/\s+/g, " ");
  }
  return n;
}

// ---------- signature block ----------

// "On Tue, 10 Nov 2026 at 12:29, Anna <a@b.at> wrote:" / "Am 10.11.2026 um 12:29 schrieb Anna:"
const QUOTE_INTRO = /^\s*(on\b.{4,200}\bwrote|am\b.{4,200}\bschrieb\b.{0,120}):\s*$/i;
const HEADER_LINE = /^\s*(von|from|an|to|cc|bcc|gesendet|sent|betreff|subject|datum|date|antworten an|reply-to)\s*:/i;
const CLOSING_LINE =
  /^\s*(mit freundlichen grüßen|mit freundlichen gruessen|freundliche grüße|beste grüße|viele grüße|liebe grüße|lg|mfg|best( regards)?|kind regards|regards|cheers|thanks|thank you|danke|herzliche grüße|schöne grüße)\b[,!.]?\s*$/i;
const CONTACT_LINE = /@[\w-]+\.|\+?\d[\d\s()/.-]{6,}\d|www\.|https?:\/\//i;

/**
 * Long selections (a whole email or thread) are cut down to the sender's signature: the
 * contact details nearest the end, ignoring quoted headers ("Von: … <mail>"), starting after
 * the closing line ("Beste Grüße") when there is one. Short text is returned unchanged.
 */
export function selectSignatureBlock(rawText: string): string {
  // Always returns LF line endings: the Swift detector's offsets must match buildDraft's text.
  // Quoted replies go first, whatever the length: "On … wrote:", "Am … schrieb:" and "> " lines
  // belong to an older sender.
  const all = rawText.replace(/\r\n?/g, "\n").split("\n");
  // Mail apps often wrap a long intro: "On Tue, 10 Nov 2026 at 12:29, Anna <a@b.at>" / "wrote:".
  const quoteStart = all.findIndex(
    (l, i) =>
      i > 0 &&
      (QUOTE_INTRO.test(l) || /^\s*>/.test(l) || (i + 1 < all.length && QUOTE_INTRO.test(`${l} ${all[i + 1].trim()}`))),
  );
  const lines = quoteStart > 0 ? all.slice(0, quoteStart) : all;
  const normalized = lines.join("\n").trimEnd();
  if (lines.filter((l) => l.trim()).length <= 14) return normalized;

  // Quoted thread starts at the first header block; the newest message is above it.
  const firstHeader = lines.findIndex(
    (l, i) => HEADER_LINE.test(l) && i > 0 && lines.slice(i, i + 4).some((x) => HEADER_LINE.test(x) && x !== l),
  );
  const scope = firstHeader > 0 ? lines.slice(0, firstHeader) : lines;
  const contactIdx = scope.map((l, i) => (CONTACT_LINE.test(l) && !HEADER_LINE.test(l) ? i : -1)).filter((i) => i >= 0);
  if (!contactIdx.length) return normalized;

  const last = contactIdx[contactIdx.length - 1];
  // Signature lines sit together; walk back over the cluster of contact lines.
  let first = last;
  for (let k = contactIdx.length - 2; k >= 0 && first - contactIdx[k] <= 4; k--) first = contactIdx[k];
  let start = Math.max(0, first - 6);
  for (let i = first; i >= Math.max(0, first - 10); i--) {
    if (CLOSING_LINE.test(scope[i])) {
      start = i + 1;
      break;
    }
  }
  const end = Math.min(scope.length, last + 4);
  return scope.slice(start, end).join("\n").trim();
}

// ---------- main ----------

export function buildDraft(rawText: string, a: Detection, options: ParseOptions = {}): ContactDraft {
  // Offsets in `a` refer to rawText exactly; pass text through selectSignatureBlock first so it
  // is already LF-only. Normalising here would shift every offset after a CRLF.
  const text = rawText;
  const lines = text.split("\n");
  // What is left of each line once detected values are cut out. Name, title and company
  // are searched only in this residue, so "Anna Huber | +43 664 ..." still yields the name.
  const residue = [...lines];
  const consume = (needle: string) => {
    // An empty or whitespace needle would become /\s*/ and erase every line.
    if (!needle || !needle.trim()) return;
    const re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*"), "gi");
    residue.forEach((l, i) => (residue[i] = l.replace(re, " ")));
  };

  // Emails: detector first, regex as a net for OCR'd text the detector missed.
  const emailSet = new Map<string, string>();
  for (const e of [
    ...a.emails,
    // Bounded and anchored so a long token (base64, JWT) cannot trigger quadratic rescans.
    ...(text.match(/(?<![\w.+-])[\w.+-]{1,64}@[\w-]{1,63}(?:\.[\w-]{1,63}){1,6}/g) ?? []),
  ]) {
    emailSet.set(e.toLowerCase(), e);
  }
  const emails = [...emailSet.values()].map((value) => ({
    value,
    label: "work",
  }));
  emails.forEach((e) => consume(e.value));

  const phones: Labeled[] = [];
  const seenPhones = new Set<string>();
  for (const p of a.phones) {
    const value = normalizePhone(p.number, options.defaultCallingCode ?? "");
    const key = value.replace(/\D/g, "");
    if (key.length < 6 || seenPhones.has(key)) continue;
    seenPhones.add(key);
    const lineStart = text.lastIndexOf("\n", p.location - 1) + 1;
    consume(text.substr(p.location, p.length));
    phones.push({
      value,
      label: phoneLabel(text.slice(lineStart, p.location), p.number),
    });
  }

  // The detector skips bare domains ("donauwerk.at"); catch those too, but not inside emails.
  const bare =
    text.match(
      /(?<![@\w.-])(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9-]{0,62}(?:\.[a-z0-9-]{1,63}){0,4}\.(?:at|de|ch|com|io|net|org|eu|co|ai|app|dev|me|tech|studio|agency)\b(?:\/[^\s,;|]{0,200})?/gi,
    ) ?? [];
  const urls: Labeled[] = [];
  for (const u of [...new Set([...a.urls, ...bare])]) {
    if (urls.some((x) => fold(x.value).includes(fold(u)) || fold(u).includes(fold(x.value)))) continue;
    if (u.includes("@")) continue;
    consume(u);
    urls.push({
      value: u,
      label: /linkedin\.com/i.test(u) ? "linkedin" : "work",
    });
  }

  // Apple's detector first; the postcode rule fills whatever it left empty
  // ("4020 Linz, Hauptplatz 5" comes back as just the street).
  const detected = a.addresses[0];
  const fallback = fallbackAddress(lines);
  let address: Address | null = null;
  if (detected || fallback) {
    const pick = (k: keyof Address) => detected?.[k] || fallback?.[k] || "";
    address = {
      street: pick("street"),
      postalCode: pick("postalCode"),
      city: pick("city"),
      country: pick("country"),
    };
    if (detected) detected.raw.split("\n").forEach(consume);
    [
      address.street,
      address.postalCode && address.city ? `${address.postalCode} ${address.city}` : "",
      address.city,
    ].forEach(consume);
  }

  // Signatures often pack several fields on one line: "Anna Huber | CEO | Huber GmbH".
  const segments: { text: string; line: number }[] = [];
  residue.forEach((l, i) => {
    for (const part of l.split(/\s+[|•·]\s+|\s{3,}/)) {
      // drop leftover field labels ("T:", "Mobil", "E-Mail:") and separators
      const t = cleanLine(
        part.replace(
          /^\s*(t|tel|telefon|phone|fon|m|mob|mobil|mobile|handy|fax|e-?mail|mail|web|www|w|e)\b\.?:?\s*$/i,
          " ",
        ),
      );
      if (t.length >= 2 && /\p{L}{2}/u.test(t)) segments.push({ text: t, line: i });
    }
  });

  // ---- name ----
  let nameSeg: { text: string; line: number } | undefined;
  const personal = emails.find((e) => {
    const [local, domain] = e.value.toLowerCase().split("@");
    return !GENERIC_LOCAL.has(local) && !!domain;
  });
  if (personal) {
    const parts = personal.value
      .split("@")[0]
      .split(/[._-]+/)
      .filter((p) => /^\p{L}{2,}$/u.test(p))
      .map(fold);
    if (parts.length) {
      // a segment that contains the surname (last part) or the first name, and reads like a name
      nameSeg =
        segments.find((s) => looksLikeName(s.text) && parts.every((p) => fold(s.text).includes(p))) ??
        segments.find((s) => looksLikeName(s.text) && fold(s.text).includes(parts[parts.length - 1])) ??
        segments.find((s) => looksLikeName(s.text) && parts.some((p) => fold(s.text).includes(p)));
    }
  }
  nameSeg ??= segments.find((s) => looksLikeName(s.text) && a.people.some((p) => s.text.includes(p)));
  nameSeg ??= segments.find((s) => looksLikeName(s.text));

  let namePrefix = "";
  let givenName = "";
  let familyName = "";
  let nameSuffix = "";
  if (nameSeg) {
    const t = splitTitles(nameSeg.text);
    const n = splitName(t.core);
    namePrefix = t.prefix;
    nameSuffix = t.suffix;
    givenName = n.given;
    familyName = n.family;
  } else if (personal) {
    // last resort: "anna.huber@" -> Anna Huber
    const parts = personal.value
      .split("@")[0]
      .split(/[._-]+/)
      .filter((p) => /^\p{L}{2,}$/u.test(p));
    if (parts.length >= 2) {
      givenName = titleCase(parts.slice(0, -1).join(" "));
      familyName = titleCase(parts[parts.length - 1]);
    }
  }

  // ---- title and company ----
  const rest = segments.filter((s) => s !== nameSeg && s.text !== nameSeg?.text);
  let jobTitle = "";
  let organization = "";

  // A line with a legal form ("Huber & Partner Consulting GmbH") is a company, even though
  // "Partner" is also a job title, unless it reads "<role> at <company>".
  const ROLE_SPLIT = /^(.+?)(?:\s+(?:at|bei|@|-|–|—)|\s*,)\s+(.+)$/i;
  const roleSeg = rest.find((s) => {
    if (!hasRoleWord(s.text) || s.text.length > 80) return false;
    if (!LEGAL_FORM.test(s.text)) return true;
    const m = s.text.match(ROLE_SPLIT);
    return !!m && hasRoleWord(m[1]) && !LEGAL_FORM.test(m[1]);
  });
  if (roleSeg) {
    // "CEO at Huber GmbH" / "Geschäftsführer bei Huber GmbH" / "CEO @ Huber"
    const m = roleSeg.text.match(ROLE_SPLIT);
    if (m && hasRoleWord(m[1]) && (!hasRoleWord(m[2]) || LEGAL_FORM.test(m[2]))) {
      jobTitle = m[1].trim();
      organization = m[2].split(/\s+[|•·]\s+/)[0].trim();
    } else {
      jobTitle = roleSeg.text;
    }
  }

  const legalSeg = rest.find((s) => s !== roleSeg && LEGAL_FORM.test(s.text) && s.text.length <= 80);
  if (legalSeg) organization = legalSeg.text;
  if (!organization) {
    const orgSeg = rest.find((s) => s !== roleSeg && a.orgs.some((o) => s.text.includes(o)));
    if (orgSeg) organization = orgSeg.text;
  }
  if (!organization && emails.length) {
    const domain = emails[0].value.split("@")[1]?.toLowerCase() ?? "";
    if (domain && !FREEMAIL.has(domain)) {
      // second-level suffixes: northbank.co.uk -> "northbank", ministerium.gv.at -> "ministerium"
      const parts = domain.split(".");
      const sld = /^(co|com|or|ac|gv|gov|org|net|ltd|plc)$/;
      const label =
        (parts.length > 2 && sld.test(parts[parts.length - 2]) ? parts[parts.length - 3] : parts[parts.length - 2]) ??
        "";
      // prefer a segment that spells out the domain ("huber-partner" -> "Huber & Partner Consulting")
      const words = label.split("-").filter((w) => w.length > 2);
      const seg = rest.find(
        (s) => s !== roleSeg && words.length > 0 && words.every((w) => fold(s.text).includes(w)) && s.text.length <= 60,
      );
      organization = seg ? seg.text : titleCase(label.replace(/-/g, " "));
    }
  }

  // No title keyword found: a short plain line right under the name is almost always the role
  // ("Bauleiter", "Kundenbetreuung", "Kurator").
  if (!jobTitle && nameSeg) {
    const next = rest.find(
      (s) => s.line === nameSeg!.line + 1 || (s.line === nameSeg!.line + 2 && !lines[nameSeg!.line + 1]?.trim()),
    );
    if (
      next &&
      next.text !== organization &&
      !LEGAL_FORM.test(next.text) &&
      !/\d|@/.test(next.text) &&
      next.text.split(/\s+/).length <= 5 &&
      next.text.length <= 50 &&
      !looksLikeName(next.text)
    ) {
      jobTitle = next.text;
    }
  }

  return {
    namePrefix,
    givenName,
    familyName,
    nameSuffix,
    organization,
    jobTitle,
    emails,
    phones,
    urls,
    address,
  };
}
