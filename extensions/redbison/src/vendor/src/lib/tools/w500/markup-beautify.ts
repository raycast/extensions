/**
 * Indenting HTML, XML and SQL without a parser library for any of them.
 *
 * They do not validate: malformed markup comes back indented as written
 * rather than corrected, because a beautifier that silently repairs a
 * document is how a file gets changed in a way nobody reviewed.
 *
 * What they must never do is change the data. An earlier version split each
 * document on every `<...>` and re-indented every token alike, and collapsed
 * all whitespace in SQL before looking at it. That trimmed `<pre>` blocks and
 * XML text values, broke tags at a `>` inside a quoted attribute or a script,
 * squeezed the spaces out of SQL string literals, and joined the line after a
 * `--` comment onto the comment (raycast/extensions#34044 review, 2026-11).
 * So now: HTML goes through the website's own formatter
 * (src/lib/tools/html-beautify.ts), XML text and mixed content are copied as
 * written, and SQL is formatted around its literals and comments, never
 * inside them. src/test/tools/local-tools-data-fidelity.test.ts pins each case.
 *
 * The real formatter the site offers for JavaScript and CSS is js-beautify,
 * which is a dependency and stays on the server. These three carry none, so
 * they belong where the editors and the CLI can reach them.
 */
import { beautifyHtml as beautifyHtmlDocument } from '../html-beautify';

/** A whole number of spaces, falling back to two for anything else. */
const indentOf = (indent: number): string =>
  ' '.repeat(Number.isFinite(indent) && indent >= 0 ? Math.min(Math.floor(indent), 16) : 2);

/**
 * The website's HTML formatter, so every front end gives the page's answer:
 * pre and textarea copied byte for byte, inline content kept on one line,
 * script and style moved as a block and never split at a `<`.
 */
export function beautifyHtml(html: string, indent = 2): string {
  return beautifyHtmlDocument(html, indentOf(indent));
}

/* ------------------------------------------------------------------ XML */

type XmlNode =
  | { kind: 'element'; name: string; open: string; close: string | null; children: XmlNode[]; start: number; end: number }
  | { kind: 'text' | 'cdata' | 'comment' | 'pi' | 'doctype' | 'stray'; raw: string };

type XmlElement = Extract<XmlNode, { kind: 'element' }>;

/** The end of a tag, skipping `>` inside quoted attribute values; -1 if it never closes. */
function tagEnd(src: string, from: number): number {
  let quote = '';
  for (let i = from; i < src.length; i += 1) {
    const c = src[i];
    if (quote) {
      if (c === quote) quote = '';
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '>') return i;
  }
  return -1;
}

/** A DOCTYPE may carry an internal subset in [...] that holds its own `>`. */
function doctypeEnd(src: string, from: number): number {
  let quote = '';
  let depth = 0;
  for (let i = from; i < src.length; i += 1) {
    const c = src[i];
    if (quote) {
      if (c === quote) quote = '';
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '[') depth += 1;
    else if (c === ']') depth = Math.max(0, depth - 1);
    else if (c === '>' && depth === 0) return i;
  }
  return -1;
}

function parseXmlLoose(src: string): XmlNode[] {
  const root: XmlElement = { kind: 'element', name: '#root', open: '', close: null, children: [], start: 0, end: src.length };
  const stack: XmlElement[] = [root];
  const top = () => stack[stack.length - 1];
  let text = '';
  const flush = () => {
    if (text) top().children.push({ kind: 'text', raw: text });
    text = '';
  };
  const until = (i: number, marker: string) => {
    const at = src.indexOf(marker, i);
    return at < 0 ? src.length : at + marker.length;
  };

  let i = 0;
  while (i < src.length) {
    if (src[i] !== '<') {
      text += src[i];
      i += 1;
      continue;
    }
    let kind: 'comment' | 'cdata' | 'pi' | 'doctype' | '' = '';
    let stop = -1;
    if (src.startsWith('<!--', i)) [kind, stop] = ['comment', until(i + 4, '-->')];
    else if (src.startsWith('<![CDATA[', i)) [kind, stop] = ['cdata', until(i + 9, ']]>')];
    else if (src.startsWith('<?', i)) [kind, stop] = ['pi', until(i + 2, '?>')];
    else if (src.startsWith('<!', i)) {
      const end = doctypeEnd(src, i + 2);
      [kind, stop] = ['doctype', end < 0 ? src.length : end + 1];
    }
    if (kind) {
      flush();
      top().children.push({ kind, raw: src.slice(i, stop) });
      i = stop;
      continue;
    }

    const close = /^<\/([^\s>/]+)\s*>/.exec(src.slice(i, i + 256));
    if (close) {
      flush();
      const at = stack.map((e) => e.name).lastIndexOf(close[1]);
      if (at > 0) {
        // Anything opened inside and never closed ends here too, as written.
        for (let k = stack.length - 1; k >= at; k -= 1) stack[k].end = i + close[0].length;
        stack[at].close = close[0];
        stack.length = at;
      } else {
        top().children.push({ kind: 'stray', raw: close[0] });
      }
      i += close[0].length;
      continue;
    }

    const open = /^<([A-Za-z_:][\w.:-]*)/.exec(src.slice(i, i + 256));
    const end = open ? tagEnd(src, i + open[0].length) : -1;
    if (!open || end < 0) {
      // Not a tag after all: a stray `<` is text, kept as written.
      text += src[i];
      i += 1;
      continue;
    }
    flush();
    const tag = src.slice(i, end + 1);
    const el: XmlElement = { kind: 'element', name: open[1], open: tag, close: null, children: [], start: i, end: end + 1 };
    top().children.push(el);
    i = end + 1;
    if (!tag.endsWith('/>')) stack.push(el);
  }
  flush();
  // Unclosed elements run to the end of the document.
  for (const el of stack) el.end = src.length;
  return root.children;
}

const isBlankText = (n: XmlNode) => n.kind === 'text' && !n.raw.trim();

/**
 * Text is data in XML, so an element holding any (a value, CDATA, or text
 * mixed with child elements) is copied exactly as written, and so is one
 * marked xml:space="preserve". Only whitespace between child elements, which
 * is layout, is replaced by indentation.
 */
function keepAsWritten(el: XmlElement): boolean {
  if (/\sxml:space\s*=\s*["']preserve["']/.test(el.open)) return true;
  if (el.children.some((c) => c.kind === 'cdata' || (c.kind === 'text' && c.raw.trim()))) return true;
  // A leaf holding only whitespace keeps it: `<a> </a>` is a one-space value.
  return el.children.length > 0 && el.children.every(isBlankText);
}

function printXml(nodes: XmlNode[], src: string, depth: number, pad: string, out: string[]): void {
  const at = pad.repeat(depth);
  for (const n of nodes) {
    if (n.kind === 'text') {
      // Only reached where text sits outside any element.
      if (n.raw.trim()) out.push(at + n.raw.trim());
      continue;
    }
    if (n.kind !== 'element') {
      out.push(at + n.raw);
      continue;
    }
    if (!n.children.length || keepAsWritten(n)) {
      out.push(at + src.slice(n.start, n.end));
      continue;
    }
    out.push(at + n.open);
    printXml(n.children, src, depth + 1, pad, out);
    if (n.close) out.push(at + n.close);
  }
}

export function beautifyXml(xml: string, indent = 2): string {
  const src = xml.trim();
  const out: string[] = [];
  printXml(parseXmlLoose(src), src, 0, indentOf(indent), out);
  return out.join('\n');
}

/* ------------------------------------------------------------------ SQL */

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET',
  'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'JOIN', 'ON', 'AND', 'OR',
  'UNION ALL', 'UNION', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
  'RETURNING', 'WITH',
];

/** Clauses that start a new line. ON, AND and OR are handled separately. */
const SQL_BREAK_BEFORE = [
  'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET',
  'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'JOIN',
  'UNION ALL', 'UNION', 'VALUES', 'SET', 'RETURNING',
];

type SqlPiece = { verbatim: boolean; text: string; lineComment?: boolean };

/** Where a quoted run that doubles its quote to escape it ends; the end of input if never. */
function quotedEnd(sql: string, from: number, q: string, backslash: boolean): number {
  for (let i = from + 1; i < sql.length; i += 1) {
    if (backslash && sql[i] === '\\') {
      i += 1;
      continue;
    }
    if (sql[i] === q) {
      if (sql[i + 1] === q) {
        i += 1;
        continue;
      }
      return i + 1;
    }
  }
  return sql.length;
}

/**
 * The query cut into code and the parts that must not be touched: string
 * literals ('...', with '' as the escape, and E'...' where a backslash
 * escapes too), quoted identifiers ("..." and `...`), [bracketed] names,
 * Postgres $tag$ bodies, and -- and block comments (which nest in Postgres).
 * MySQL's backslash escape in ordinary strings is not assumed: standard SQL
 * and Postgres read 'C:\' as a complete string, and guessing wrong either
 * way would reformat the inside of a literal.
 */
function splitSql(sql: string): SqlPiece[] {
  const pieces: SqlPiece[] = [];
  let code = '';
  const push = (text: string, lineComment = false) => {
    if (code) pieces.push({ verbatim: false, text: code });
    code = '';
    pieces.push({ verbatim: true, text, lineComment });
  };
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    const next = sql[i + 1];
    let end = -1;
    if (c === '-' && next === '-') {
      const nl = sql.slice(i).search(/\r?\n/);
      end = nl < 0 ? sql.length : i + nl;
      push(sql.slice(i, end), true);
      i = end;
      continue;
    }
    if (c === '/' && next === '*') {
      let depth = 0;
      for (let k = i; k < sql.length; k += 1) {
        if (sql[k] === '/' && sql[k + 1] === '*') {
          depth += 1;
          k += 1;
        } else if (sql[k] === '*' && sql[k + 1] === '/') {
          depth -= 1;
          k += 1;
          if (depth === 0) {
            end = k + 1;
            break;
          }
        }
      }
      if (end < 0) end = sql.length;
    } else if (c === "'") {
      const escapeString = /(^|[^\w$])[eE]$/.test(sql.slice(Math.max(0, i - 2), i));
      end = quotedEnd(sql, i, "'", escapeString);
    } else if (c === '"' || c === '`') {
      end = quotedEnd(sql, i, c, false);
    } else if (c === '[') {
      const close = sql.indexOf(']', i + 1);
      end = close < 0 ? sql.length : close + 1;
    } else if (c === '$') {
      const tag = /^\$(?:[A-Za-z_][\w]*)?\$/.exec(sql.slice(i));
      if (tag && !/[\w$]/.test(sql[i - 1] ?? '')) {
        const close = sql.indexOf(tag[0], i + tag[0].length);
        end = close < 0 ? sql.length : close + tag[0].length;
      }
    }
    if (end > i) {
      push(sql.slice(i, end));
      i = end;
      continue;
    }
    code += c;
    i += 1;
  }
  if (code) pieces.push({ verbatim: false, text: code });
  return pieces;
}

export function beautifySql(sql: string): string {
  const pieces = splitSql(sql);
  // Each untouchable piece becomes a marker the keyword passes cannot match
  // (no letters, no whitespace), and is put back afterwards.
  const mark = (n: number) => `\u0001${n}\u0001`;
  let s = pieces.map((p, n) => (p.verbatim ? mark(n) : p.text)).join('');
  s = s.replace(/\s+/g, ' ').trim();
  for (const kw of SQL_KEYWORDS) {
    s = s.replace(new RegExp(`\\b${kw.replace(/ /g, '\\s+')}\\b`, 'gi'), kw);
  }
  for (const kw of SQL_BREAK_BEFORE) s = s.replace(new RegExp(`\\s${kw}\\b`, 'g'), `\n${kw}`);
  s = s.replace(/\s(AND|OR)\b/g, '\n  $1');
  // A -- comment runs to the end of its line, so whatever follows it has to
  // start a new one or it becomes part of the comment.
  s = s.replace(/\u0001(\d+)\u0001( ?)/g, (_m, n: string, space: string, offset: number, whole: string) => {
    const p = pieces[Number(n)];
    if (!p.lineComment) return p.text + space;
    const rest = whole.slice(offset + _m.length);
    return p.text + (rest === '' || rest.startsWith('\n') ? '' : '\n');
  });
  return s.trim();
}
