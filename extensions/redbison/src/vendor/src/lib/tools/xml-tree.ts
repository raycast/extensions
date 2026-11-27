/**
 * An outline of an XML document: the element tree with attribute counts and
 * text previews, without the noise of every closing tag. Uses the same
 * dependency-free tokenizer approach as w500/markup-beautify.ts, so the CLI
 * and the editor plugins can bundle it; the browser's DOMParser is not
 * available in Node 18.
 */

const PREVIEW_CHARS = 40;

type Node = { tag: string; attrs: number; children: Node[]; text: string };

/** Parses just enough XML for an outline; throws on mismatched tags. */
export function parseOutline(xml: string): Node[] {
  const src = xml.trim();
  if (!src.startsWith('<')) throw new Error('Not an XML document: it does not start with a tag.');
  const roots: Node[] = [];
  const stack: Node[] = [];
  const attach = (n: Node) => (stack.length ? stack[stack.length - 1].children.push(n) : roots.push(n));
  for (const t of src.split(/(<[^>]+>)/).filter(Boolean)) {
    if (!t.startsWith('<')) {
      const text = t.replace(/\s+/g, ' ').trim();
      if (text && stack.length) {
        const top = stack[stack.length - 1];
        top.text = top.text ? `${top.text} ${text}` : text;
      }
      continue;
    }
    if (t.startsWith('<?') || t.startsWith('<!')) continue; // declaration, DOCTYPE, comment
    if (t.startsWith('</')) {
      const tag = t.slice(2, -1).trim();
      const open = stack.pop();
      if (!open) throw new Error(`Closing </${tag}> with nothing open.`);
      if (open.tag !== tag) throw new Error(`Expected </${open.tag}> but found </${tag}>.`);
      continue;
    }
    const inner = t.slice(1, t.endsWith('/>') ? -2 : -1).trim();
    const tag = inner.split(/[\s/]/, 1)[0];
    if (!tag) throw new Error(`Malformed tag: ${t}`);
    const attrs = (inner.match(/[\w:.-]+\s*=\s*("[^"]*"|'[^']*')/g) ?? []).length;
    const node: Node = { tag, attrs, children: [], text: '' };
    attach(node);
    if (!t.endsWith('/>')) stack.push(node);
  }
  if (stack.length) throw new Error(`Unclosed <${stack[stack.length - 1].tag}>.`);
  if (!roots.length) throw new Error('No elements found.');
  return roots;
}

const describe = (n: Node): string => {
  const parts = [`<${n.tag}>`];
  if (n.attrs) parts.push(`${n.attrs} ${n.attrs === 1 ? 'attribute' : 'attributes'}`);
  if (n.children.length) parts.push(`${n.children.length} ${n.children.length === 1 ? 'child' : 'children'}`);
  if (n.text) {
    const cut = n.text.length > PREVIEW_CHARS ? `${n.text.slice(0, PREVIEW_CHARS)}…` : n.text;
    parts.push(`"${cut}"`);
  }
  return parts.join('  ');
};

function branch(lines: string[], nodes: Node[], prefix: string): void {
  nodes.forEach((n, i) => {
    const last = i === nodes.length - 1;
    lines.push(`${prefix}${last ? '└─' : '├─'} ${describe(n)}`);
    if (n.children.length) branch(lines, n.children, prefix + (last ? '   ' : '│  '));
  });
}

/** The element outline for an XML document. */
export function renderXmlTree(input: string): string {
  const roots = parseOutline(input);
  const lines: string[] = [];
  roots.forEach((root, i) => {
    lines.push(describe(root));
    if (root.children.length) branch(lines, root.children, '');
    if (i < roots.length - 1) lines.push('');
  });
  return lines.join('\n');
}
