import type { RichValue } from "../api/types";

interface RichNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: RichNode[];
}

const attr = (node: RichNode, key: string): string =>
  typeof node.attrs?.[key] === "string" ? (node.attrs[key] as string) : "";

/**
 * Line breaks as Markdown counts them. CommonMark ends a line at `\r` as well as
 * `\n`; a lone `\r` left in place would end a line that the container prefixes
 * below never saw, and whatever followed it would escape its blockquote or list.
 */
const unixLines = (text: string): string => text.replace(/\r\n?/g, "\n");

/**
 * Text from a task, made inert for Markdown.
 *
 * Titles and descriptions are written by anyone in the workspace, and the app
 * shows them as plain text. Unescaped, `![](https://…)` would make Raycast fetch
 * a remote image the moment the task is opened, and `[x](file:///…)` would put a
 * live link one click away. Every piece of task text goes through here; the only
 * Markdown syntax in the output is what this module writes itself.
 */
export function escapeMarkdown(text: string): string {
  return unixLines(text).replace(/[\\`*_{}[\]()#+\-.!|<>~&=]/g, "\\$&");
}

/**
 * Flatten a task description into Markdown for Raycast's detail view.
 *
 * The editor's document model is richer than this — the app's own
 * `richDocToText` walks a dozen more node kinds. Here the goal is only to make a
 * description READABLE in a 400-pixel panel, so the mapping stops at the shapes
 * that carry meaning when flattened: text, headings, lists, quotes, code, and
 * the inline chips that stand for a person, a task or a date. Anything else
 * contributes its children's text. Writing rich text is deliberately out of
 * scope — this extension only ever sends plain strings.
 *
 * The one structural rule that keeps the output inert: a container owns EVERY
 * line of what it holds. A blockquote prefixes each line with `>`, a list item
 * indents each continuation line under its marker — blank lines included. A line
 * that lost its prefix would leave the container, and a code block it belonged
 * to would stop being code: its raw text would be read as Markdown.
 */
export function richToMarkdown(value: RichValue | undefined, images: Record<string, string> = {}): string {
  if (value == null) return "";
  if (typeof value === "string") return escapeMarkdown(value.trim());
  return blocks(value as RichNode, images)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** A fence one backtick longer than any run inside, so the code cannot close it. */
function fence(code: string): string {
  const longest = Math.max(0, ...(code.match(/`+/g) ?? []).map((run) => run.length));
  return "`".repeat(Math.max(3, longest + 1));
}

/** Each line of `text` behind `first` (line one) or `rest` (every other line, blank ones too). */
function prefixLines(text: string, first: string, rest: string): string {
  return text
    .split("\n")
    .map((line, i) => {
      const prefix = i === 0 ? first : rest;
      // A blank line keeps its `>`; indentation alone would only be trailing space.
      return line ? `${prefix}${line}` : prefix.trimEnd();
    })
    .join("\n");
}

const LISTS = new Set(["bulletList", "orderedList", "taskList"]);

/**
 * The blocks inside one container, joined so they stay separate blocks: a blank
 * line between them, except a list right after a paragraph, which is the
 * "item text, then its sub-list" shape and may follow directly.
 */
function joinBlocks(children: RichNode[], images: Record<string, string>): string {
  const parts = children
    .map((child) => ({ child, md: blocks(child, images).join("\n\n") }))
    .filter((part) => part.md.length > 0);
  return parts
    .map((part, i) => {
      if (i === 0) return part.md;
      const tight = LISTS.has(part.child.type ?? "") && parts[i - 1].child.type === "paragraph";
      return `${tight ? "\n" : "\n\n"}${part.md}`;
    })
    .join("");
}

/** One list item: the marker on the first line, every other line indented beneath it. */
function listItem(marker: string, body: string): string {
  if (!body) return marker;
  return prefixLines(body, `${marker} `, " ".repeat(marker.length + 1));
}

function blocks(node: RichNode, images: Record<string, string>): string[] {
  switch (node.type) {
    case "heading": {
      const level = typeof node.attrs?.level === "number" ? node.attrs.level : 1;
      // Clamped both ways: the level is document data, and `repeat` throws on a
      // negative count. One line: a break inside would end the heading.
      const text = inline(node).replace(/\n+/g, " ").trim();
      return text ? [`${"#".repeat(Math.max(1, Math.min(level + 1, 6)))} ${text}`] : [];
    }
    case "paragraph":
      return inline(node).trim() ? [inline(node)] : [];
    case "codeBlock": {
      const code = unixLines(raw(node));
      return [`${fence(code)}\n${code}\n${fence(code)}`];
    }
    case "blockquote": {
      const body = joinBlocks(node.content ?? [], images);
      return body ? [prefixLines(body, "> ", "> ")] : [];
    }
    case "bulletList":
    case "orderedList": {
      const items = (node.content ?? []).map((item, index) =>
        listItem(node.type === "orderedList" ? `${index + 1}.` : "-", joinBlocks(item.content ?? [], images)),
      );
      return items.length ? [items.join("\n")] : [];
    }
    case "taskList": {
      const items = (node.content ?? []).map((item) => {
        const box = item.attrs?.checked ? "[x]" : "[ ]";
        const body = joinBlocks(item.content ?? [], images);
        // The box belongs on the item's first line — unless that line opens a
        // block of its own (a fence, a quote), which the box would break.
        const opensBlock = body === "" || /^(`{3,}|>|#|-|\d+\.)/.test(body);
        return listItem("-", opensBlock ? `${box}${body ? `\n${body}` : ""}` : `${box} ${body}`);
      });
      return items.length ? [items.join("\n")] : [];
    }
    case "horizontalRule":
      return ["---"];
    case "image": {
      const alt = escapeMarkdown(attr(node, "alt")).replace(/\n+/g, " ");
      const fileId = attr(node, "fileId");
      const path = Object.hasOwn(images, fileId) ? images[fileId] : undefined;
      // The path is percent-encoded because it is a markdown destination: an
      // unescaped space ("Application Support") or parenthesis ends it early, and
      // the whole image tag then renders as literal text. Width capped so a
      // screenshot does not push the body off-screen.
      if (path) {
        const destination = encodeURI(path).replace(/\(/g, "%28").replace(/\)/g, "%29");
        return [`![${alt}](${destination}?raycast-width=520)`];
      }
      return alt ? [`_${alt}_`] : [];
    }
    case "fileEmbed": {
      const chip = inline(node);
      return chip ? [chip] : [];
    }
  }

  return (node.content ?? []).flatMap((child) => blocks(child, images));
}

/** Inline content of one block, with the chips spelled out the way they read. */
function inline(node: RichNode): string {
  if (node.type === "text") return escapeMarkdown(node.text ?? "");
  if (node.type === "hardBreak") return "\n";
  if (node.type === "personMention") return `@${escapeMarkdown(attr(node, "label"))}`;
  if (node.type === "taskMention") return `\\#${escapeMarkdown(attr(node, "label"))}`;
  if (node.type === "dateChip") return escapeMarkdown(attr(node, "value"));
  if (node.type === "statusChip") return escapeMarkdown(attr(node, "label") || attr(node, "value"));
  if (node.type === "linkPill") return escapeMarkdown(attr(node, "title") || attr(node, "href"));
  // An attachment sits inline in the editor, inside a paragraph — so it is
  // spelled out here, not only as a block.
  if (node.type === "fileEmbed") return attr(node, "filename") ? `📎 ${escapeMarkdown(attr(node, "filename"))}` : "";
  return (node.content ?? []).map(inline).join("");
}

/** Text of a code block, left as typed — the fence around it is what keeps it inert. */
function raw(node: RichNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(raw).join("");
}
