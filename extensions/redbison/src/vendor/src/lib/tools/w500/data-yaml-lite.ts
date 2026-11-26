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

/** JSON value out, YAML text in the subset above. */
export function toYaml(v: unknown, indent = 0): string {
  const pad = ' '.repeat(indent);
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string') {
    // Quote anything that would otherwise be read back as structure, a
    // number or a boolean. Cheaper to over-quote than to change the value.
    if (/^[\s]|[\s]$|[:#&*!|>'"%@`,[\]{}]|^-|^\d/.test(v) || v === '') return JSON.stringify(v);
    return v;
  }
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    return v
      .map((item) => {
        const rendered = toYaml(item, indent + 2);
        return rendered.includes('\n')
          ? `${pad}-\n${rendered.split('\n').map((l) => `  ${l}`).join('\n')}`
          : `${pad}- ${rendered}`;
      })
      .join('\n');
  }
  if (typeof v === 'object') {
    const entries = Object.entries(v as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    return entries
      .map(([k, val]) => {
        const child = toYaml(val, indent + 2);
        return child.includes('\n') ? `${pad}${k}:\n${child}` : `${pad}${k}: ${child}`;
      })
      .join('\n');
  }
  return String(v);
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

function tokenize(src: string): Line[] {
  return src
    .split(/\r?\n/)
    .map((raw) => {
      const stripped = raw.replace(/#.*$/, '');
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
    const colon = c.indexOf(':');
    if (colon === -1) return [obj, i];
    const key = c.slice(0, colon).trim();
    const inline = c.slice(colon + 1).trim();
    if (inline.length > 0) {
      obj[key] = parseScalar(inline);
      i += 1;
    } else {
      const [val, ni] = parseBlock(lines, i + 1, indent + 2);
      obj[key] = val;
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

/**
 * Tidy, not reformat: tabs to spaces, trailing whitespace gone, runs of blank
 * lines collapsed to one. Structure is left exactly as written, because
 * re-emitting it would mean parsing it, and this parser is a subset.
 */
export function tidyYaml(yaml: string): string {
  const lines = yaml.replace(/\t/g, '  ').split(/\r?\n/).map((l) => l.replace(/\s+$/, ''));
  const out: string[] = [];
  let lastBlank = false;
  for (const l of lines) {
    const blank = l.trim().length === 0;
    if (blank && lastBlank) continue;
    out.push(l);
    lastBlank = blank;
  }
  return out.join('\n').replace(/^\n+|\n+$/g, '');
}
