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
 * Text from a task, made inert for Markdown.
 *
 * Titles and descriptions are written by anyone in the workspace, and the app
 * shows them as plain text. Unescaped, `![](https://…)` would make Raycast fetch
 * a remote image the moment the task is opened, and `[x](file:///…)` would put a
 * live link one click away. Every piece of task text goes through here; the only
 * Markdown syntax in the output is what this module writes itself.
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]()#+\-.!|<>~&]/g, "\\$&");
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
 */
export function richToMarkdown(value: RichValue | undefined, images: Record<string, string> = {}): string {
  if (value == null) return "";
  if (typeof value === "string") return escapeMarkdown(value.trim());
  return blocks(value as RichNode, 0, images)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** A fence one backtick longer than any run inside, so the code cannot close it. */
function fence(code: string): string {
  const longest = Math.max(0, ...(code.match(/`+/g) ?? []).map((run) => run.length));
  return "`".repeat(Math.max(3, longest + 1));
}

function blocks(node: RichNode, depth = 0, images: Record<string, string> = {}): string[] {
  const out: string[] = [];

  switch (node.type) {
    case "heading": {
      const level = typeof node.attrs?.level === "number" ? node.attrs.level : 1;
      // Clamped both ways: the level is document data, and `repeat` throws on a negative count.
      out.push(`${"#".repeat(Math.max(1, Math.min(level + 1, 6)))} ${inline(node)}`);
      return out;
    }
    case "paragraph":
      return inline(node).trim() ? [inline(node)] : [];
    case "codeBlock": {
      const code = raw(node);
      return [`${fence(code)}\n${code}\n${fence(code)}`];
    }
    case "blockquote":
      return [
        (node.content ?? [])
          .flatMap((child) => blocks(child, depth, images))
          .map((b) => `> ${b}`)
          .join("\n"),
      ];
    case "bulletList":
    case "orderedList": {
      const items = (node.content ?? []).map((item, index) => {
        const marker = node.type === "orderedList" ? `${index + 1}.` : "-";
        const body = (item.content ?? []).flatMap((child) => blocks(child, depth + 1, images)).join(" ");
        return `${"  ".repeat(depth)}${marker} ${body}`;
      });
      return [items.join("\n")];
    }
    case "taskList":
      return [
        (node.content ?? [])
          .map((item) => `- [${item.attrs?.checked ? "x" : " "}] ${(item.content ?? []).map(inline).join(" ")}`)
          .join("\n"),
      ];
    case "horizontalRule":
      return ["---"];
    case "image": {
      const alt = escapeMarkdown(attr(node, "alt"));
      const fileId = attr(node, "fileId");
      const path = Object.hasOwn(images, fileId) ? images[fileId] : undefined;
      // The path is percent-encoded because it is a markdown destination and the
      // support directory it lives in contains spaces ("Application Support") —
      // an unescaped space ends the destination early, and the whole image tag
      // then renders as literal text. Width capped so a screenshot does not push
      // the body off-screen.
      if (path) return [`![${alt}](${encodeURI(path)}?raycast-width=520)`];
      return alt ? [`_${alt}_`] : [];
    }
    case "fileEmbed": {
      const chip = inline(node);
      return chip ? [chip] : [];
    }
  }

  return (node.content ?? []).flatMap((child) => blocks(child, depth, images));
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
