// Turns the Markdown typed in the create form into Atlassian Document Format, which Jira's v3 API
// needs for descriptions. Covers what people type in a short description: paragraphs, headings,
// lists, code blocks, bold, italic, inline code and links.

interface Mark {
  type: string;
  attrs?: Record<string, string>;
}

interface Node {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Mark[];
  content?: Node[];
}

export function markdownToAdf(markdown: string): Node & { version: 1 } {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const content: Node[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    const fence = /^\s*```\s*([\w+#-]*)/.exec(line);
    if (fence) {
      const code: string[] = [];
      for (i++; i < lines.length && !/^\s*```/.test(lines[i]); i++) code.push(lines[i]);
      i++;
      const text = code.join("\n");
      content.push({
        type: "codeBlock",
        ...(fence[1] ? { attrs: { language: fence[1] } } : {}),
        ...(text ? { content: [{ type: "text", text }] } : {}),
      });
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      content.push({ type: "heading", attrs: { level: heading[1].length }, content: inline(heading[2]) });
      i++;
      continue;
    }

    const list = listKind(line);
    if (list) {
      const items: Node[] = [];
      for (; i < lines.length && listKind(lines[i])?.kind === list.kind; i++) {
        items.push({ type: "listItem", content: [paragraph(lines[i].replace(list.marker, ""))] });
      }
      content.push({ type: list.kind, content: items });
      continue;
    }

    const paragraphLines: string[] = [];
    for (; i < lines.length && lines[i].trim() && !startsBlock(lines[i]); i++) paragraphLines.push(lines[i]);
    content.push(paragraph(paragraphLines.join("\n")));
  }

  return { version: 1, type: "doc", content };
}

const BULLET = /^\s*[-*+]\s+/;
const NUMBERED = /^\s*\d+[.)]\s+/;

function listKind(line: string): { kind: "bulletList" | "orderedList"; marker: RegExp } | undefined {
  if (BULLET.test(line)) return { kind: "bulletList", marker: BULLET };
  if (NUMBERED.test(line)) return { kind: "orderedList", marker: NUMBERED };
  return undefined;
}

function startsBlock(line: string): boolean {
  return /^\s*```/.test(line) || /^#{1,6}\s/.test(line) || Boolean(listKind(line));
}

function paragraph(text: string): Node {
  // Line breaks inside a paragraph stay line breaks.
  const content = text
    .split("\n")
    .flatMap((line, index) => (index > 0 ? [{ type: "hardBreak" }, ...inline(line)] : inline(line)));
  return { type: "paragraph", content };
}

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*|_[^_]+_)|(\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;

function inline(text: string): Node[] {
  const nodes: Node[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) nodes.push({ type: "text", text: text.slice(last, match.index) });
    const [token, code, bold, italic, link] = match;
    if (code) nodes.push({ type: "text", text: code.slice(1, -1), marks: [{ type: "code" }] });
    else if (bold) nodes.push({ type: "text", text: bold.slice(2, -2), marks: [{ type: "strong" }] });
    else if (italic) nodes.push({ type: "text", text: italic.slice(1, -1), marks: [{ type: "em" }] });
    else if (link) {
      const [, label, href] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(link) ?? [];
      nodes.push({ type: "text", text: label, marks: [{ type: "link", attrs: { href } }] });
    } else nodes.push({ type: "text", text: token });
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push({ type: "text", text: text.slice(last) });
  // Jira rejects empty text nodes.
  return nodes.filter((node) => node.text);
}
