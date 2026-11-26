/**
 * Indenting HTML, XML and SQL without a parser for any of them.
 *
 * Each is a tokeniser and a depth counter, which is enough to make a minified
 * document readable and is all these tools have ever claimed. They do not
 * validate: malformed markup comes back indented as written rather than
 * corrected, because a beautifier that silently repairs a document is how a
 * file gets changed in a way nobody reviewed.
 *
 * The real formatter the site offers for JavaScript and CSS is js-beautify,
 * which is a dependency and stays on the server. These three carry none, so
 * they belong where the editors and the CLI can reach them.
 */

/** Elements that never have a closing tag, so they must not open a level. */
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

export function beautifyHtml(html: string, indent = 2): string {
  const tokens = html.replace(/>\s+</g, '><').trim().split(/(<[^>]+>)/).filter(Boolean);
  const out: string[] = [];
  let depth = 0;
  const pad = () => ' '.repeat(depth * indent);
  for (const t of tokens) {
    if (!t.startsWith('<')) {
      if (t.trim()) out.push(pad() + t.trim());
      continue;
    }
    if (t.startsWith('<!--') || t.startsWith('<!') || t.startsWith('<?')) {
      out.push(pad() + t);
      continue;
    }
    if (t.startsWith('</')) {
      depth = Math.max(0, depth - 1);
      out.push(pad() + t);
      continue;
    }
    const tag = (t.match(/^<\s*([a-zA-Z0-9-]+)/) ?? [])[1]?.toLowerCase() ?? '';
    out.push(pad() + t);
    if (!t.endsWith('/>') && !VOID_ELEMENTS.has(tag)) depth += 1;
  }
  return out.join('\n');
}

export function beautifyXml(xml: string, indent = 2): string {
  const src = xml.replace(/>\s+</g, '><').trim();
  const out: string[] = [];
  let depth = 0;
  const pad = () => ' '.repeat(depth * indent);
  for (const t of src.split(/(<[^>]+>)/).filter(Boolean)) {
    if (!t.startsWith('<')) {
      if (t.trim()) out.push(pad() + t.trim());
      continue;
    }
    if (t.startsWith('<?') || t.startsWith('<!')) {
      out.push(pad() + t);
      continue;
    }
    if (t.startsWith('</')) {
      depth = Math.max(0, depth - 1);
      out.push(pad() + t);
      continue;
    }
    out.push(pad() + t);
    // XML has no void elements: everything not self-closed opens a level.
    if (!t.endsWith('/>')) depth += 1;
  }
  return out.join('\n');
}

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

export function beautifySql(sql: string): string {
  let s = sql.replace(/\s+/g, ' ').trim();
  for (const kw of SQL_KEYWORDS) {
    s = s.replace(new RegExp(`\\b${kw.replace(/ /g, '\\s+')}\\b`, 'gi'), kw);
  }
  for (const kw of SQL_BREAK_BEFORE) s = s.replace(new RegExp(`\\s${kw}\\b`, 'g'), `\n${kw}`);
  s = s.replace(/\s(AND|OR)\b/g, '\n  $1');
  return s.trim();
}
