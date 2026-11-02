// Reader for Godot's ConfigFile text format, used by projects.cfg and project.godot.
// It follows core/io/config_file.cpp and core/variant/variant_parser.cpp in the Godot source.
// Only strings, numbers, booleans, arrays and string arrays are decoded; other values
// (dictionaries, Object(...), Vector2(...), ...) are skipped and kept as raw text.
// Like Godot, it rejects the whole file when it finds a syntax error.

export type ConfigValue = string | number | boolean | null | ConfigValue[] | { raw: string };

export type ConfigFile = Map<string, Map<string, ConfigValue>>;

export class ConfigParseError extends Error {
  constructor(message: string, line: number) {
    super(`${message} on line ${line}`);
    this.name = "ConfigParseError";
  }
}

const STRING_ARRAY_TYPES = new Set(["PackedStringArray", "PoolStringArray"]);

export function parseConfigFile(input: string): ConfigFile {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const sections: ConfigFile = new Map();
  let pos = 0;

  const fail = (message: string, at = pos): never => {
    let line = 1;
    for (let i = 0; i < at && i < text.length; i++) {
      if (text[i] === "\n") line++;
    }
    throw new ConfigParseError(message, line);
  };

  const isSpace = (char: string | undefined) => char !== undefined && char.charCodeAt(0) <= 32;

  const skipLine = () => {
    while (pos < text.length && text[pos] !== "\n") pos++;
  };

  // Like Godot's tokenizer, this also skips ";" comments between values.
  const skipWhitespace = () => {
    while (pos < text.length) {
      if (isSpace(text[pos])) {
        pos++;
      } else if (text[pos] === ";") {
        skipLine();
      } else {
        return;
      }
    }
  };

  const readString = (): string => {
    const start = pos;
    pos++; // opening quote
    let result = "";
    while (true) {
      if (pos >= text.length) fail("Unterminated string", start);
      const char = text[pos++];
      if (char === '"') return result;
      if (char !== "\\") {
        result += char;
        continue;
      }
      if (pos >= text.length) fail("Unterminated string", start);
      const next = text[pos++];
      switch (next) {
        case "b":
          result += "\b";
          break;
        case "t":
          result += "\t";
          break;
        case "n":
          result += "\n";
          break;
        case "f":
          result += "\f";
          break;
        case "r":
          result += "\r";
          break;
        case "u":
        case "U": {
          const length = next === "U" ? 6 : 4;
          const hex = text.slice(pos, pos + length);
          if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length !== length) fail("Malformed hex constant in string");
          pos += length;
          const code = parseInt(hex, 16);
          if (code > 0x10ffff) fail("Invalid Unicode escape in string");
          // \u values are UTF-16 code units, so surrogate pairs join up on their own.
          result += next === "U" ? String.fromCodePoint(code) : String.fromCharCode(code);
          break;
        }
        default:
          result += next;
      }
    }
  };

  // Skips a bracketed value such as {...}, (...) or [...], including nested ones.
  const skipGroup = (): void => {
    const start = pos;
    const closers: string[] = [];
    const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
    while (true) {
      if (pos >= text.length) fail("Unexpected end of file inside a value", start);
      const char = text[pos];
      if (char === '"') {
        readString();
        continue;
      }
      if (char === ";") {
        skipLine();
        continue;
      }
      pos++;
      if (pairs[char]) {
        closers.push(pairs[char]);
      } else if (char === ")" || char === "]" || char === "}") {
        if (closers.pop() !== char) fail(`Unexpected "${char}"`, pos - 1);
        if (closers.length === 0) return;
      }
    }
  };

  const readList = (closer: string): ConfigValue[] => {
    pos++; // opening bracket
    const items: ConfigValue[] = [];
    while (true) {
      skipWhitespace();
      if (text[pos] === closer) {
        pos++;
        return items;
      }
      items.push(readValue());
      skipWhitespace();
      if (text[pos] === ",") {
        pos++;
      } else if (text[pos] === closer) {
        pos++;
        return items;
      } else {
        fail(`Expected "," or "${closer}"`);
      }
    }
  };

  const readIdentifierValue = (): ConfigValue => {
    const start = pos;
    while (pos < text.length && /[A-Za-z0-9_]/.test(text[pos])) pos++;
    const name = text.slice(start, pos);
    // Typed arrays look like Array[String]([...]).
    if (text[pos] === "[") skipGroup();
    let lookahead = pos;
    while (text[lookahead] === " " || text[lookahead] === "\t") lookahead++;
    if (text[lookahead] === "(") {
      pos = lookahead;
      if (STRING_ARRAY_TYPES.has(name)) {
        return readList(")").map((item) => (typeof item === "string" ? item : String(item)));
      }
      skipGroup();
      return { raw: text.slice(start, pos) };
    }
    switch (name) {
      case "true":
        return true;
      case "false":
        return false;
      case "null":
      case "nil":
        return null;
      case "inf":
        return Infinity;
      case "inf_neg":
        return -Infinity;
      case "nan":
        return NaN;
      default:
        return fail(`Unexpected identifier "${name}"`, start);
    }
  };

  const readValue = (): ConfigValue => {
    skipWhitespace();
    const char = text[pos];
    if (char === undefined) return fail("Expected a value");
    if (char === '"') return readString();
    if ((char === "&" || char === "^") && text[pos + 1] === '"') {
      pos++;
      return readString();
    }
    if (char === "[") return readList("]");
    if (char === "{") {
      const start = pos;
      skipGroup();
      return { raw: text.slice(start, pos) };
    }
    if (/[0-9+\-.]/.test(char)) {
      const start = pos;
      while (pos < text.length && /[0-9A-Za-z_.+-]/.test(text[pos])) pos++;
      const token = text.slice(start, pos);
      if (token === "-inf") return -Infinity;
      const number = Number(token);
      return Number.isNaN(number) ? fail(`Invalid number "${token}"`, start) : number;
    }
    if (/[A-Za-z_]/.test(char)) return readIdentifierValue();
    return fail(`Unexpected "${char}"`);
  };

  // Mirrors ConfigFile::set_value(): sections exist only while they have keys, and null removes a key.
  const setValue = (section: string, key: string, value: ConfigValue) => {
    let entries = sections.get(section);
    if (value === null) {
      entries?.delete(key);
      if (entries?.size === 0) sections.delete(section);
      return;
    }
    if (!entries) {
      entries = new Map();
      sections.set(section, entries);
    }
    entries.set(key, value);
  };

  let section = "";
  let key = "";

  while (pos < text.length) {
    const char = text[pos];

    if (char === ";") {
      skipLine();
      continue;
    }

    if (char === "[" && key === "") {
      const start = pos;
      pos++;
      let name = "";
      let escaping = false;
      while (true) {
        if (pos >= text.length) fail("Unexpected end of file in a section name", start);
        const current = text[pos++];
        if (current === "]") {
          if (!escaping) break;
          escaping = false;
        } else {
          escaping = current === "\\";
        }
        name += current;
      }
      section = name.trim().replaceAll("\\]", "]");
      continue;
    }

    if (char === '"') {
      key = readString();
      continue;
    }

    if (char === "=") {
      pos++;
      setValue(section, key, readValue());
      key = "";
      continue;
    }

    if (!isSpace(char)) key += char;
    pos++;
  }

  return sections;
}

export function getString(file: ConfigFile, section: string, key: string): string | undefined {
  const value = file.get(section)?.get(key);
  return typeof value === "string" ? value : undefined;
}

export function getBoolean(file: ConfigFile, section: string, key: string): boolean | undefined {
  const value = file.get(section)?.get(key);
  return typeof value === "boolean" ? value : undefined;
}

export function getNumber(file: ConfigFile, section: string, key: string): number | undefined {
  const value = file.get(section)?.get(key);
  return typeof value === "number" ? value : undefined;
}

export function getStringArray(file: ConfigFile, section: string, key: string): string[] | undefined {
  const value = file.get(section)?.get(key);
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
}
