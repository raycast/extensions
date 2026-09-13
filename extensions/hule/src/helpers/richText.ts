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
  if (typeof value === "string") return value.trim();
  return blocks(value as RichNode, 0, images)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function blocks(node: RichNode, depth = 0, images: Record<string, string> = {}): string[] {
  const out: string[] = [];

  switch (node.type) {
    case "heading": {
      const level = typeof node.attrs?.level === "number" ? node.attrs.level : 1;
      out.push(`${"#".repeat(Math.min(level + 1, 6))} ${inline(node)}`);
      return out;
    }
    case "paragraph":
      return inline(node).trim() ? [inline(node)] : [];
    case "codeBlock":
      return [`\`\`\`\n${inline(node)}\n\`\`\``];
    case "blockquote":
      return [
        (node.content ?? [])
          .flatMap((child) => blocks(child, depth))
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
      const alt = attr(node, "alt");
      const path = images[attr(node, "fileId")];
      // The path is percent-encoded because it is a markdown destination and the
      // support directory it lives in contains spaces ("Application Support") —
      // an unescaped space ends the destination early, and the whole image tag
      // then renders as literal text. Width capped so a screenshot does not push
      // the body off-screen.
      if (path) return [`![${alt}](${encodeURI(path)}?raycast-width=520)`];
      return alt ? [`_${alt}_`] : [];
    }
    case "fileEmbed": {
      const filename = attr(node, "filename");
      return filename ? [`📎 ${filename}`] : [];
    }
  }

  return (node.content ?? []).flatMap((child) => blocks(child, depth, images));
}

/** Inline content of one block, with the chips spelled out the way they read. */
function inline(node: RichNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "personMention") return `@${attr(node, "label")}`;
  if (node.type === "taskMention") return `#${attr(node, "label")}`;
  if (node.type === "dateChip") return attr(node, "value");
  if (node.type === "statusChip") return attr(node, "label") || attr(node, "value");
  if (node.type === "linkPill") return attr(node, "title") || attr(node, "href");
  return (node.content ?? []).map(inline).join("");
}
