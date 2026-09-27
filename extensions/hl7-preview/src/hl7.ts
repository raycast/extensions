export interface Delimiters {
  field: string;
  component: string;
  repetition: string;
  escape: string;
  subcomponent: string;
}

export interface Field {
  /** HL7 position, e.g. 4 for OBR-4. */
  position: number;
  raw: string;
  /** repetitions → components → subcomponents, all unescaped. */
  repetitions: string[][][];
}

export interface Segment {
  name: string;
  raw: string;
  /** 1-based line number in the source text. */
  line: number;
  fields: Field[];
}

export interface Message {
  delimiters: Delimiters;
  segments: Segment[];
}

const DEFAULT_DELIMITERS: Delimiters = {
  field: "|",
  component: "^",
  repetition: "~",
  escape: "\\",
  subcomponent: "&",
};

const HEADER_SEGMENTS = new Set(["MSH", "FHS", "BHS"]);
const BATCH_SEGMENTS = new Set(["FHS", "BHS", "BTS", "FTS"]);

/**
 * Decodes a file buffer as UTF-8, falling back to Windows-1252.
 * MSH-18 is not trusted: some labs declare `8859/1` there and still send UTF-8.
 */
export function decodeBuffer(buffer: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

export function looksLikeHL7(text: string): boolean {
  return /^(MSH|FHS|BHS)[^A-Za-z0-9\s]/m.test(text.trimStart());
}

/** Parses text that holds one or more HL7 v2 messages. A new message starts at every MSH segment. */
export function parseHL7(text: string): Message[] {
  const messages: Message[] = [];
  let current: Message | undefined;
  let delimiters = DEFAULT_DELIMITERS;

  text.split(/\r\n|\r|\n/).forEach((rawLine, index) => {
    // MLLP frames wrap messages in VT (\x0b) and FS (\x1c); trim() drops VT, FS needs removing.
    const line = rawLine.replaceAll("\x1c", "").trim();
    if (!/^[A-Z][A-Z0-9]{2}/.test(line)) return;

    const name = line.slice(0, 3);
    if (HEADER_SEGMENTS.has(name)) delimiters = readDelimiters(line);
    // Batch envelopes (FHS/BHS headers, BTS/FTS trailers) wrap messages; they are not part of one.
    if (BATCH_SEGMENTS.has(name)) {
      current = undefined;
      return;
    }
    if (name === "MSH" || !current) {
      current = { delimiters, segments: [] };
      messages.push(current);
    }
    current.segments.push(parseSegment(line, index + 1, delimiters));
  });

  return messages;
}

function readDelimiters(line: string): Delimiters {
  const [field, component, repetition, escape, subcomponent] = line.slice(3, 8);
  return {
    field: field ?? DEFAULT_DELIMITERS.field,
    component: component ?? DEFAULT_DELIMITERS.component,
    repetition: repetition ?? DEFAULT_DELIMITERS.repetition,
    escape: escape ?? DEFAULT_DELIMITERS.escape,
    subcomponent: subcomponent ?? DEFAULT_DELIMITERS.subcomponent,
  };
}

function parseSegment(line: string, lineNumber: number, d: Delimiters): Segment {
  const name = line.slice(0, 3);
  const parts = line.split(d.field);
  const fields: Field[] = [];

  if (HEADER_SEGMENTS.has(name)) {
    // MSH-1 is the field separator itself and MSH-2 holds the encoding characters, unsplit.
    const encoding = parts[1] ?? "";
    fields.push({ position: 1, raw: d.field, repetitions: [[[d.field]]] });
    fields.push({ position: 2, raw: encoding, repetitions: [[[encoding]]] });
    parts.slice(2).forEach((raw, i) => fields.push(parseField(raw, i + 3, d)));
  } else {
    parts.slice(1).forEach((raw, i) => fields.push(parseField(raw, i + 1, d)));
  }

  return { name, raw: line, line: lineNumber, fields };
}

function parseField(raw: string, position: number, d: Delimiters): Field {
  const repetitions = raw
    .split(d.repetition)
    .map((rep) => rep.split(d.component).map((comp) => comp.split(d.subcomponent).map((sub) => unescape(sub, d))));
  return { position, raw, repetitions };
}

/** Resolves HL7 escape sequences such as \F\, \S\, \.br\ and \X41\. */
export function unescape(value: string, d: Delimiters): string {
  if (!value.includes(d.escape)) return value;
  const e = escapeRegExp(d.escape);
  return value.replace(new RegExp(`${e}([^${e}]*)${e}`, "g"), (match, code: string) => {
    switch (code) {
      case "F":
        return d.field;
      case "S":
        return d.component;
      case "T":
        return d.subcomponent;
      case "R":
        return d.repetition;
      case "E":
        return d.escape;
      case ".br":
        return "\n";
      case "H":
      case "N":
        return "";
    }
    if (/^X[0-9A-Fa-f]+$/.test(code)) {
      // The hex is a byte sequence, so multi-byte UTF-8 (\XC3A9\ = "é") decodes as one character.
      const bytes = Uint8Array.from((code.slice(1).match(/../g) ?? []).map((hex) => parseInt(hex, 16)));
      return decodeBuffer(bytes);
    }
    if (/^\.sp\d*$/.test(code)) return "\n".repeat(Number(code.slice(3)) || 1);
    return match;
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
}

/** Returns field `position` of the segment, or undefined when absent. */
export function field(segment: Segment | undefined, position: number): Field | undefined {
  return segment?.fields.find((f) => f.position === position);
}

/** Returns one component (1-based) of the first repetition, unescaped. */
export function component(segment: Segment | undefined, position: number, comp = 1): string {
  return field(segment, position)?.repetitions[0]?.[comp - 1]?.join("&") ?? "";
}

export function isEmpty(f: Field): boolean {
  return f.raw.trim() === "" || f.raw === '""';
}

/** Formats an HL7 DTM/TS value (YYYY[MM[DD[HH[MM[SS[.S]]]]]][+/-ZZZZ]) for reading. */
export function formatTimestamp(value: string): string | undefined {
  const m = value.match(/^(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\.\d+)?([+-]\d{4})?$/);
  if (!m) return undefined;
  const [, y, mo, d, h, mi, s, , tz] = m;
  let out = [y, mo, d].filter(Boolean).join("-");
  if (h) out += ` ${[h, mi ?? "00", s].filter(Boolean).join(":")}`;
  if (tz) out += ` ${tz}`;
  return out;
}
