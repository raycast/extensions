/**
 * A small, lenient HTML pretty-printer.
 *
 * Rules that keep the rendered page identical:
 * - Void elements (br, img, meta, input, ...) never open an indent level.
 * - Inline content (text, a, span, strong, code, ...) stays on one line, so no
 *   whitespace is added or removed between words and inline tags.
 * - pre, textarea, script and style content is copied verbatim.
 * - Comments, DOCTYPE and CDATA are kept as written.
 * Malformed markup is tolerated: unmatched end tags are kept in place and
 * unclosed elements are printed without inventing a closing tag.
 */

export const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr', 'keygen',
]);

const INLINE_ELEMENTS = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'button', 'cite', 'code', 'data', 'del', 'dfn', 'em', 'i', 'img', 'input',
  'ins', 'kbd', 'label', 'mark', 'meter', 'output', 'progress', 'q', 's', 'samp', 'select', 'small', 'span',
  'strong', 'sub', 'sup', 'textarea', 'time', 'u', 'var', 'wbr',
]);

const RAW_TEXT = new Set(['script', 'style', 'pre', 'textarea']);

// Start tags that implicitly close an open element of the given name.
const IMPLIED_END: Record<string, Set<string>> = {
  li: new Set(['li']),
  dt: new Set(['dt', 'dd']),
  dd: new Set(['dt', 'dd']),
  tr: new Set(['tr', 'td', 'th']),
  td: new Set(['td', 'th']),
  th: new Set(['td', 'th']),
  option: new Set(['option']),
  p: new Set(['p']),
};
const CLOSES_P = new Set([
  'address', 'article', 'aside', 'blockquote', 'div', 'dl', 'fieldset', 'footer', 'form', 'h1', 'h2', 'h3', 'h4',
  'h5', 'h6', 'header', 'hr', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul', 'figure', 'details',
]);

type TextNode = { type: 'text'; value: string };
type RawNode = { type: 'raw'; value: string }; // comment, doctype, cdata, stray end tag
type ElementNode = {
  type: 'element';
  name: string; // lower-case
  open: string; // normalized start tag
  close: string | null; // literal end tag, null when absent in source
  rawContent?: string; // for pre/textarea/script/style
  children: HtmlNode[];
};
type HtmlNode = TextNode | RawNode | ElementNode;

const ATTR_RE = /([^\s"'<>/=]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g;

function normalizeOpenTag(name: string, attrText: string, selfClosing: boolean): string {
  const attrs: string[] = [];
  let m: RegExpExecArray | null;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(attrText))) attrs.push(m[2] !== undefined ? `${m[1]}=${m[2]}` : m[1]);
  return `<${name}${attrs.length ? ' ' + attrs.join(' ') : ''}${selfClosing ? ' /' : ''}>`;
}

/** Finds the end of a start tag, skipping `>` inside quoted attribute values. */
function findTagEnd(src: string, from: number): number {
  let quote: string | null = null;
  for (let i = from; i < src.length; i++) {
    const c = src[i];
    if (quote) { if (c === quote) quote = null; }
    else if (c === '"' || c === "'") quote = c;
    else if (c === '>') return i;
  }
  return -1;
}

export function parseHtml(src: string): HtmlNode[] {
  const root: ElementNode = { type: 'element', name: '#root', open: '', close: null, children: [] };
  const stack: ElementNode[] = [root];
  const top = () => stack[stack.length - 1];
  let i = 0;
  let text = '';
  const flush = () => { if (text) { top().children.push({ type: 'text', value: text }); text = ''; } };

  while (i < src.length) {
    if (src[i] !== '<') { text += src[i++]; continue; }
    const rest = src.slice(i, i + 9);
    if (rest.startsWith('<!--')) {
      const end = src.indexOf('-->', i + 4);
      const stop = end < 0 ? src.length : end + 3;
      flush(); top().children.push({ type: 'raw', value: src.slice(i, stop) }); i = stop; continue;
    }
    if (rest.toUpperCase().startsWith('<![CDATA[')) {
      const end = src.indexOf(']]>', i);
      const stop = end < 0 ? src.length : end + 3;
      flush(); top().children.push({ type: 'raw', value: src.slice(i, stop) }); i = stop; continue;
    }
    if (rest.startsWith('<!') || rest.startsWith('<?')) {
      const end = src.indexOf('>', i);
      const stop = end < 0 ? src.length : end + 1;
      flush(); top().children.push({ type: 'raw', value: src.slice(i, stop).replace(/\s+/g, ' ') }); i = stop; continue;
    }
    const endTag = /^<\/([A-Za-z][\w:-]*)\s*>/.exec(src.slice(i));
    if (endTag) {
      flush();
      const name = endTag[1].toLowerCase();
      const idx = stack.map((e) => e.name).lastIndexOf(name);
      if (idx > 0) {
        stack[idx].close = `</${endTag[1]}>`;
        stack.length = idx;
      } else {
        top().children.push({ type: 'raw', value: endTag[0] });
      }
      i += endTag[0].length;
      continue;
    }
    const startTag = /^<([A-Za-z][\w:-]*)/.exec(src.slice(i));
    if (!startTag) { text += src[i++]; continue; }
    const tagEnd = findTagEnd(src, i + startTag[0].length);
    if (tagEnd < 0) { text += src.slice(i); break; }
    flush();
    const rawName = startTag[1];
    const name = rawName.toLowerCase();
    let attrText = src.slice(i + startTag[0].length, tagEnd);
    const selfClosing = /\/\s*$/.test(attrText);
    if (selfClosing) attrText = attrText.replace(/\/\s*$/, '');
    i = tagEnd + 1;

    // Implied end tags (an <li> closes the previous <li>, a <div> closes an open <p>).
    const implied = IMPLIED_END[name];
    if (implied && implied.has(top().name)) stack.pop();
    else if (CLOSES_P.has(name) && top().name === 'p') stack.pop();

    const el: ElementNode = { type: 'element', name, open: normalizeOpenTag(rawName, attrText, selfClosing), close: null, children: [] };
    top().children.push(el);
    if (selfClosing || VOID_ELEMENTS.has(name)) continue;
    if (RAW_TEXT.has(name)) {
      const closeRe = new RegExp(`</${name}\\s*>`, 'i');
      const m = closeRe.exec(src.slice(i));
      const contentEnd = m ? i + m.index : src.length;
      el.rawContent = src.slice(i, contentEnd);
      el.close = m ? m[0] : null;
      i = m ? contentEnd + m[0].length : src.length;
      continue;
    }
    stack.push(el);
  }
  flush();
  return root.children;
}

// Only ASCII whitespace collapses in HTML; a no-break space (U+00A0) is content and must survive.
const HTML_WS = /[ \t\n\f\r]+/g;
const trimHtml = (s: string) => s.replace(/^[ \t\n\f\r]+|[ \t\n\f\r]+$/g, '');

const isInlineNode = (n: HtmlNode): boolean => {
  if (n.type === 'text') return true;
  // A comment between words must not become a line break, which would add a space.
  if (n.type === 'raw') return n.value.startsWith('<!--');
  if (!INLINE_ELEMENTS.has(n.name)) return false;
  if (n.name === 'textarea') return !(n.rawContent || '').includes('\n');
  return n.children.every(isInlineNode);
};

function renderInline(n: HtmlNode): string {
  if (n.type === 'text') return n.value.replace(HTML_WS, ' ');
  if (n.type === 'raw') return n.value;
  if (n.rawContent !== undefined) return n.open + n.rawContent + (n.close ?? '');
  return n.open + n.children.map(renderInline).join('') + (n.close ?? '');
}

function dedent(text: string): string[] {
  const lines = text.replace(/^\s*\n/, '').replace(/\s+$/, '').split('\n');
  const indents = lines.filter((l) => l.trim()).map((l) => (l.match(/^[ \t]*/) as RegExpMatchArray)[0].length);
  const cut = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(cut));
}

function renderBlock(nodes: HtmlNode[], depth: number, tab: string, out: string[]): void {
  const pad = tab.repeat(depth);
  let run: HtmlNode[] = [];
  const flushRun = () => {
    const line = trimHtml(run.map(renderInline).join(''));
    if (line) out.push(pad + line);
    run = [];
  };
  for (const n of nodes) {
    if (isInlineNode(n)) { run.push(n); continue; }
    flushRun();
    if (n.type === 'raw') { out.push(pad + n.value.trim()); continue; }
    if (n.type === 'text') continue;
    if (n.rawContent !== undefined) {
      if (n.name === 'pre' || n.name === 'textarea') {
        // Whitespace is significant: copy the content byte for byte.
        out.push(pad + n.open + n.rawContent + (n.close ?? ''));
      } else if (!n.rawContent.trim()) {
        out.push(pad + n.open + (n.close ?? ''));
      } else if (!n.rawContent.includes('\n')) {
        out.push(pad + n.open + n.rawContent.trim() + (n.close ?? ''));
      } else {
        out.push(pad + n.open);
        dedent(n.rawContent).forEach((l) => out.push(l.trim() ? pad + tab + l : ''));
        if (n.close) out.push(pad + n.close);
      }
      continue;
    }
    if (!n.children.length || n.children.every(isInlineNode)) {
      const inner = trimHtml(n.children.map(renderInline).join(''));
      out.push(pad + n.open + inner + (n.close ?? ''));
      continue;
    }
    out.push(pad + n.open);
    renderBlock(n.children, depth + 1, tab, out);
    if (n.close) out.push(pad + n.close);
  }
  flushRun();
}

export function beautifyHtml(input: string, indent = '  '): string {
  const out: string[] = [];
  renderBlock(parseHtml(input), 0, indent, out);
  return out.join('\n');
}
