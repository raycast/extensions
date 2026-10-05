import { randomUUID } from "crypto";

/** Everything a template needs to know about the copy it is naming. */
export type TemplateContext = {
  /** Original file name without its extension. */
  stem: string;
  /** Original extension without the leading dot. */
  ext: string;
  /** Original file name including the extension. */
  base: string;
  /** Name of the folder the original lives in. */
  parent: string;
  /** Counter value for this copy, already offset by the configured start index. */
  counter: number;
  /** How many copies are being made of this file. */
  total: number;
  /** 1-based position of the source file when several were selected. */
  fileIndex: number;
  /** How many source files are being duplicated. */
  fileTotal: number;
  /** Default zero padding applied to counters that do not specify their own. */
  padding: number;
  /** Timestamp shared by every copy in a single run, so a batch gets one consistent stamp. */
  now: Date;
};

export type TemplateVariable = {
  token: string;
  description: string;
  example: string;
};

/** Documentation for the in-app cheat sheet. Keep in sync with `resolve` below. */
export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { token: "{name}", description: "Original name without extension", example: "Invoice" },
  { token: "{ext}", description: "Original extension without the dot", example: "pdf" },
  { token: "{base}", description: "Original name with extension", example: "Invoice.pdf" },
  { token: "{parent}", description: "Name of the enclosing folder", example: "Documents" },
  { token: "{n}", description: "Copy counter, padded by the Padding field", example: "2" },
  { token: "{n:3}", description: "Copy counter padded to a set width", example: "002" },
  { token: "{total}", description: "Number of copies being made", example: "5" },
  { token: "{index}", description: "Position of the source file in the selection", example: "1" },
  { token: "{count}", description: "Number of source files selected", example: "3" },
  { token: "{date}", description: "Current date", example: "2026-09-06" },
  { token: "{time}", description: "Current time", example: "14-32-05" },
  { token: "{datetime}", description: "Current date and time", example: "2026-09-06 14-32-05" },
  {
    token: "{date:MMM D}",
    description: "Custom format (YYYY YY MMMM MMM MM M DD D dddd ddd HH h mm ss A)",
    example: "Sep 6",
  },
  { token: "{year} {month} {day}", description: "Individual date parts", example: "2026 09 06" },
  { token: "{hour} {minute} {second}", description: "Individual time parts", example: "14 32 05" },
  { token: "{timestamp}", description: "Unix timestamp in seconds", example: "1788712325" },
  { token: "{rand}", description: "Random string, {rand:8} sets the length", example: "a7f2c1" },
  { token: "{uuid}", description: "Random UUID, {uuid:short} for the first block", example: "9f1c0b3a" },
  { token: "{name:upper}", description: "Modifiers: upper lower title kebab snake camel pascal", example: "INVOICE" },
];

function pad(value: number, width: number): string {
  const digits = String(Math.abs(value));
  const sign = value < 0 ? "-" : "";
  return sign + digits.padStart(Math.max(width, 0), "0");
}

/** Splits an arbitrary string into words, honoring camelCase as well as separators. */
function toWords(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
}

function applyModifier(value: string, modifier: string): string {
  switch (modifier.toLowerCase()) {
    case "upper":
      return value.toUpperCase();
    case "lower":
      return value.toLowerCase();
    case "title":
      return toWords(value)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    case "kebab":
      return toWords(value).join("-").toLowerCase();
    case "snake":
      return toWords(value).join("_").toLowerCase();
    case "camel": {
      const words = toWords(value).map((word) => word.toLowerCase());
      return words.map((word, i) => (i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))).join("");
    }
    case "pascal":
      return toWords(value)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join("");
    case "trim":
      return value.trim();
    default:
      return value;
  }
}

const DATE_TOKENS = /YYYY|YY|MMMM|MMM|MM|M|dddd|ddd|DD|D|HH|H|hh|h|mm|m|ss|s|A|a/g;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function formatDate(date: Date, pattern: string): string {
  const hours12 = date.getHours() % 12 || 12;

  return pattern.replace(DATE_TOKENS, (token) => {
    switch (token) {
      case "YYYY":
        return String(date.getFullYear());
      case "YY":
        return pad(date.getFullYear() % 100, 2);
      case "MMMM":
        return MONTHS[date.getMonth()];
      case "MMM":
        return MONTHS[date.getMonth()].slice(0, 3);
      case "MM":
        return pad(date.getMonth() + 1, 2);
      case "M":
        return String(date.getMonth() + 1);
      case "dddd":
        return DAYS[date.getDay()];
      case "ddd":
        return DAYS[date.getDay()].slice(0, 3);
      case "DD":
        return pad(date.getDate(), 2);
      case "D":
        return String(date.getDate());
      case "HH":
        return pad(date.getHours(), 2);
      case "H":
        return String(date.getHours());
      case "hh":
        return pad(hours12, 2);
      case "h":
        return String(hours12);
      case "mm":
        return pad(date.getMinutes(), 2);
      case "m":
        return String(date.getMinutes());
      case "ss":
        return pad(date.getSeconds(), 2);
      case "s":
        return String(date.getSeconds());
      case "A":
        return date.getHours() < 12 ? "AM" : "PM";
      case "a":
        return date.getHours() < 12 ? "am" : "pm";
      default:
        return token;
    }
  });
}

const RANDOM_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomString(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += RANDOM_ALPHABET[Math.floor(Math.random() * RANDOM_ALPHABET.length)];
  }
  return out;
}

/**
 * Resolves a single token. Returns `undefined` for unknown variables so the caller
 * can leave them untouched and warn about the typo instead of silently dropping text.
 */
function resolve(name: string, arg: string | undefined, context: TemplateContext): string | undefined {
  const text = (value: string) => (arg ? applyModifier(value, arg) : value);
  const number = (value: number) => pad(value, arg ? Number(arg) || 0 : context.padding);

  switch (name.toLowerCase()) {
    case "name":
    case "stem":
      return text(context.stem);
    case "ext":
    case "extension":
      return text(context.ext);
    case "base":
    case "basename":
    case "filename":
      return text(context.base);
    case "parent":
    case "folder":
      return text(context.parent);
    case "n":
    case "i":
    case "counter":
    case "copy":
      return number(context.counter);
    case "total":
      return String(context.total);
    case "index":
    case "fileindex":
      return number(context.fileIndex);
    case "count":
    case "filecount":
      return String(context.fileTotal);
    case "date":
      return formatDate(context.now, arg || "YYYY-MM-DD");
    case "time":
      return formatDate(context.now, arg || "HH-mm-ss");
    case "datetime":
      return formatDate(context.now, arg || "YYYY-MM-DD HH-mm-ss");
    case "year":
      return formatDate(context.now, "YYYY");
    case "month":
      return formatDate(context.now, "MM");
    case "day":
      return formatDate(context.now, "DD");
    case "hour":
      return formatDate(context.now, "HH");
    case "minute":
      return formatDate(context.now, "mm");
    case "second":
      return formatDate(context.now, "ss");
    case "timestamp":
    case "epoch":
      return String(Math.floor(context.now.getTime() / 1000));
    case "rand":
    case "random":
      return randomString(Math.min(Math.max(arg ? Number(arg) || 6 : 6, 1), 32));
    case "uuid": {
      const uuid = randomUUID();
      return arg?.toLowerCase() === "short" ? uuid.split("-")[0] : uuid;
    }
    default:
      return undefined;
  }
}

const TOKEN = /\{\{|\}\}|\{([a-zA-Z][a-zA-Z0-9]*)(?::([^}]*))?\}/g;

export type RenderResult = {
  /** The rendered name. Unknown tokens are left in place verbatim. */
  value: string;
  /** Tokens that did not match a known variable, for surfacing typos to the user. */
  unknown: string[];
};

/** Expands `{variable}` tokens in `template`. `{{` and `}}` escape literal braces. */
export function renderTemplate(template: string, context: TemplateContext): RenderResult {
  const unknown: string[] = [];

  const value = template.replace(TOKEN, (match, name?: string, arg?: string) => {
    if (match === "{{") return "{";
    if (match === "}}") return "}";

    const resolved = resolve(name as string, arg, context);
    if (resolved === undefined) {
      unknown.push(match);
      return match;
    }
    return resolved;
  });

  return { value, unknown };
}

/** True when the template references the original extension itself. */
export function templateUsesExtension(template: string): boolean {
  return /\{(ext|extension|base|basename|filename)(:[^}]*)?\}/i.test(template);
}

/** True when the template varies per copy, i.e. repeated copies will not collide by construction. */
export function templateUsesCounter(template: string): boolean {
  return /\{(n|i|counter|copy|rand|random|uuid|timestamp|epoch)(:[^}]*)?\}/i.test(template);
}
