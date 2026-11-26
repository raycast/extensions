/**
 * A small YAML writer and reader, and a tidier for YAML somebody else wrote.
 *
 * Deliberately not a YAML implementation. It covers indentation-based maps,
 * `- ` sequences, scalars and single-line flow collections, which is what the
 * two converter tools have always claimed and no more: anchors, tags and
 * block scalars are out of scope, and a document using them should go through
 * a real parser rather than get a plausible wrong answer here.
 *
 * It lives here rather than inside the MCP handler so the editors and the CLI
 * can convert without a round trip, and so there is one implementation to be
 * wrong in rather than two.
 */

/** Words YAML 1.1 or 1.2 would read as a boolean or null rather than a string. */
const RESERVED = /^(?:y|n|yes|no|true|false|on|off|null|~)$/i;

/**
 * A string as a YAML scalar: plain when it is unmistakably a string, and
 * double-quoted otherwise.
 *
 * The plain form is allowed only for a conservative shape (a letter or
 * underscore first, then letters, digits, spaces and `_ . / + @ ( ) -`, no
 * trailing space) that is not a word YAML 1.1 or 1.2 reads as a boolean or
 * null. Everything else is quoted, so `"false"`, `"1.2.3"`, `"a: b"` and
 * `"#fff"` stay strings in every reader. The quoted form is JSON's, which is
 * valid YAML, with the characters YAML treats as line breaks or as
 * non-printable (NEL, the two Unicode separators, DEL, C1 controls, BOM)
 * escaped as well.
 */
function yamlString(v: string): string {
  if (/^[A-Za-z_][\w ./+@()-]*$/.test(v) && !/\s$/.test(v) && !RESERVED.test(v)) return v;
  return JSON.stringify(v).replace(
    /[\u007f-\u009f\u2028\u2029\ufeff]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
}

const isCollection = (v: unknown): v is object => v !== null && typeof v === 'object';
const isNonEmpty = (v: unknown): boolean =>
  isCollection(v) && (Array.isArray(v) ? v.length > 0 : Object.keys(v).length > 0);

function yamlScalar(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string') return yamlString(v);
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null';
  if (typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return '[]';
  if (isCollection(v)) return '{}';
  return yamlString(String(v));
}

/** Block lines for a non-empty collection, each starting with `indent` spaces. */
function yamlLines(v: object, indent: number): string[] {
  const pad = ' '.repeat(indent);
  const out: string[] = [];
  if (Array.isArray(v)) {
    for (const item of v) {
      if (isNonEmpty(item)) {
        // The item's first line shares the dash: `- a: 1` / `- - 1`.
        const inner = yamlLines(item as object, indent + 2);
        out.push(`${pad}- ${inner[0].slice(indent + 2)}`, ...inner.slice(1));
      } else out.push(`${pad}- ${yamlScalar(item)}`);
    }
    return out;
  }
  for (const [k, val] of Object.entries(v)) {
    const key = yamlString(k);
    if (isNonEmpty(val)) out.push(`${pad}${key}:`, ...yamlLines(val as object, indent + 2));
    else out.push(`${pad}${key}: ${yamlScalar(val)}`);
  }
  return out;
}

/**
 * JSON value out, as block YAML that any YAML 1.1 or 1.2 reader turns back
 * into the same JSON: nested maps and lists always on their own lines, and
 * every string or key quoted when it could read back as something else.
 * src/test/tools/local-tools-data-fidelity.test.ts round-trips it through the
 * `yaml` package, the parser the website's own converter uses.
 */
export function toYaml(v: unknown): string {
  return isNonEmpty(v) ? yamlLines(v as object, 0).join('\n') : yamlScalar(v);
}

function parseScalar(s: string): unknown {
  const t = s.trim();
  if (t === '' || t === 'null' || t === '~') return null;
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (/^-?\d+$/.test(t)) return Number(t);
  if (/^-?\d*\.\d+$/.test(t)) return Number(t);
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    try {
      return JSON.parse(t.startsWith("'") ? `"${t.slice(1, -1).replace(/"/g, '\\"')}"` : t);
    } catch {
      return t.slice(1, -1);
    }
  }
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
    try {
      return JSON.parse(t);
    } catch {
      /* not JSON-shaped flow after all; fall through to the raw string */
    }
  }
  return t;
}

type Line = { indent: number; raw: string; content: string };

/**
 * The line without its comment. A `#` starts a comment only at the start of
 * the line or after whitespace, and never inside a quoted scalar, so
 * `color: "#ffffff"` and `a: b#c` keep their values. A quote opens a scalar
 * only where one can start (line start, after whitespace or a flow bracket),
 * so the apostrophe in `a: it's` is just a letter.
 */
function stripComment(line: string): string {
  let quote = '';
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (quote === '"') {
      if (c === '\\') i += 1;
      else if (c === '"') quote = '';
      continue;
    }
    if (quote === "'") {
      if (c === "'") {
        if (line[i + 1] === "'") i += 1;
        else quote = '';
      }
      continue;
    }
    const prev = i === 0 ? ' ' : line[i - 1];
    if ((c === '"' || c === "'") && /[\s[{,]/.test(prev)) quote = c;
    else if (c === '#' && /\s/.test(prev)) return line.slice(0, i);
  }
  return line;
}

/** Where the `key:` of a mapping line ends, outside quotes; -1 if the line has none. */
function mappingColon(content: string): number {
  let quote = '';
  let loose = -1;
  for (let i = 0; i < content.length; i += 1) {
    const c = content[i];
    if (quote) {
      if (quote === '"' && c === '\\') i += 1;
      else if (c === quote) quote = '';
      continue;
    }
    if ((c === '"' || c === "'") && i === 0) quote = c;
    else if (c === ':') {
      if (i + 1 === content.length || /\s/.test(content[i + 1])) return i;
      if (loose < 0) loose = i;
    }
  }
  // `a:1` is a plain scalar in YAML, but this reader has always taken it as
  // a key, and a document that relies on that keeps working.
  return loose;
}

/** Set a key as an own property, so `__proto__` is data rather than the prototype. */
function setKey(obj: Record<string, unknown>, key: string, value: unknown): void {
  Object.defineProperty(obj, key, { value, enumerable: true, writable: true, configurable: true });
}

function tokenize(src: string): Line[] {
  return src
    .split(/\r?\n/)
    .map((raw) => {
      const stripped = stripComment(raw);
      const m = stripped.match(/^(\s*)(.*)$/);
      return { indent: m ? m[1].length : 0, raw, content: (m ? m[2] : stripped).trimEnd() };
    })
    .filter((l) => l.content.length > 0);
}

function parseBlock(lines: Line[], i: number, indent: number): [unknown, number] {
  if (i >= lines.length || lines[i].indent < indent) return [null, i];
  if (lines[i].content.startsWith('- ')) {
    const arr: unknown[] = [];
    while (i < lines.length && lines[i].indent === indent && lines[i].content.startsWith('- ')) {
      const rest = lines[i].content.slice(2);
      if (rest.includes(':') && !rest.startsWith('"')) {
        const synthetic: Line[] = [{ indent: indent + 2, raw: rest, content: rest }];
        const [val, ni] = parseBlock([...synthetic, ...lines.slice(i + 1)], 0, indent + 2);
        arr.push(val);
        i = i + 1 + (ni - 1);
      } else {
        arr.push(parseScalar(rest));
        i += 1;
      }
    }
    return [arr, i];
  }
  const obj: Record<string, unknown> = {};
  while (i < lines.length && lines[i].indent === indent) {
    const c = lines[i].content;
    const colon = mappingColon(c);
    if (colon === -1) return [obj, i];
    const rawKey = c.slice(0, colon).trim();
    // A quoted key, as toYaml writes one, is read back as its string.
    const key = /^(["']).*\1$/.test(rawKey) ? String(parseScalar(rawKey)) : rawKey;
    const inline = c.slice(colon + 1).trim();
    if (inline.length > 0) {
      setKey(obj, key, parseScalar(inline));
      i += 1;
    } else {
      const [val, ni] = parseBlock(lines, i + 1, indent + 2);
      setKey(obj, key, val);
      i = ni;
    }
  }
  return [obj, i];
}

export function yamlToValue(yaml: string): unknown {
  const lines = tokenize(yaml);
  const baseIndent = lines[0]?.indent ?? 0;
  const [val] = parseBlock(lines, 0, baseIndent);
  return val;
}

/** A line that opens a block scalar (`key: |`, `- >-`, `|2+`), and whether it keeps trailing newlines. */
function blockScalarOpener(content: string): { keep: boolean } | null {
  const m = /^(.*?)(\s*)[|>]([1-9][+-]?|[+-][1-9]?)?$/.exec(content);
  if (!m) return null;
  const head = m[1];
  const opens = head === '' || (m[2] !== '' && (head.endsWith(':') || /(^|\s)-$/.test(head) || head === '---'));
  return opens ? { keep: (m[3] ?? '').includes('+') } : null;
}

/** The column a block scalar's content has to be deeper than: the key's, or the dash's. */
function blockParentColumn(line: string): number {
  const lead = (line.match(/^ */) as RegExpMatchArray)[0].length;
  const dashes = (line.slice(lead).match(/^(?:- +)*/) as RegExpMatchArray)[0];
  const rest = line.slice(lead + dashes.length);
  if (mappingColon(stripComment(rest)) > 0) return lead + dashes.length;
  return dashes ? lead + dashes.trimEnd().lastIndexOf('-') : lead;
}

/**
 * Tabs in the separation whitespace a line is built from: its indentation,
 * after a sequence dash, and between `key:` and the value. YAML forbids tabs
 * as indentation, so those become two spaces each. Tabs anywhere else are
 * part of a value (quoted or plain) and stay.
 */
function structuralTabs(line: string): string {
  let out = line.replace(/^[ \t]+/, (ws) => ws.replace(/\t/g, '  '));
  out = out.replace(/^( *(?:-[ \t]+)+)/, (ws) => ws.replace(/\t/g, '  '));
  const lead = (out.match(/^ *(?:- +)*/) as RegExpMatchArray)[0].length;
  const body = out.slice(lead);
  const colon = mappingColon(stripComment(body));
  if (colon >= 0) {
    const after = body.slice(colon + 1);
    const sep = (after.match(/^[ \t]*/) as RegExpMatchArray)[0];
    out = out.slice(0, lead + colon + 1) + sep.replace(/\t/g, '  ') + after.slice(sep.length);
  }
  return out;
}

/**
 * Tidy, not reformat: indentation tabs to spaces, trailing whitespace gone,
 * runs of blank lines collapsed to one. Structure is left exactly as written,
 * because re-emitting it would mean parsing it, and this parser is a subset.
 *
 * Values are never touched: a tab inside a quoted or plain scalar stays, and
 * the body of a block scalar (`|` or `>`), where trailing spaces, tabs and
 * blank lines are all part of the text, is copied as written.
 */
export function tidyYaml(yaml: string): string {
  const out: { text: string; blank: boolean; keep: boolean }[] = [];
  let block: { column: number; keep: boolean } | null = null;
  for (const raw of yaml.split(/\r?\n/)) {
    const blank = raw.trim().length === 0;
    if (block) {
      const lead = (raw.match(/^ */) as RegExpMatchArray)[0].length;
      if (blank || lead > block.column) {
        out.push({ text: raw, blank, keep: blank ? block.keep : true });
        continue;
      }
      block = null;
    }
    const line = structuralTabs(raw).replace(/\s+$/, '');
    if (blank) {
      if (out.length && out[out.length - 1].blank && !out[out.length - 1].keep) continue;
      out.push({ text: '', blank: true, keep: false });
      continue;
    }
    out.push({ text: line, blank: false, keep: false });
    const opener = blockScalarOpener(stripComment(line.trimStart()).trimEnd());
    if (opener) block = { column: blockParentColumn(line), keep: opener.keep };
  }
  // Blank lines at either end go, unless a keep (`|+`) block owns them.
  while (out.length && out[0].blank) out.shift();
  while (out.length && out[out.length - 1].blank && !out[out.length - 1].keep) out.pop();
  return out.map((l) => l.text).join('\n');
}
