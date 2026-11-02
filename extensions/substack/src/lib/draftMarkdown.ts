import { isDeepStrictEqual } from "node:util";

import { draftBody } from "./createDraft";

type Node = { type: string; text?: string; attrs?: Record<string, unknown>; content?: Node[]; marks?: Node[] };
export function markdownBody(markdown: string): string {
  return markdown.trim() ? draftBody(markdown) : JSON.stringify({ type: "doc", content: [] });
}
function render(node: Node): string {
  const children = node.content ?? [];
  const inline = () => children.map(render).join("");
  const blocks = () => children.map(render).join("\n\n");
  switch (node.type) {
    case "doc":
      return blocks();
    case "paragraph":
      return inline();
    case "heading":
      return `${"#".repeat(Number(node.attrs?.level))} ${inline()}`;
    case "horizontal_rule":
      return "---";
    case "blockquote":
      return blocks()
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    case "bullet_list":
    case "ordered_list":
      return children
        .map((child, index) => {
          const prefix = node.type === "bullet_list" ? "- " : `${Number(node.attrs?.start ?? 1) + index}. `;
          return (
            prefix +
            render(child)
              .split("\n")
              .join(`\n${" ".repeat(prefix.length)}`)
          );
        })
        .join("\n");
    case "list_item":
      return blocks();
    case "captionedImage":
      return `![${node.attrs?.alt ?? ""}](${node.attrs?.src}${node.attrs?.title ? ` "${node.attrs.title}"` : ""})`;
    case "text": {
      let value = (node.text ?? "").replace(/([\\`*_[\]<>])/g, "\\$1");
      for (const mark of [...(node.marks ?? [])].reverse()) {
        if (mark.type === "strong") value = `**${value}**`;
        else if (mark.type === "em") value = `*${value}*`;
        else if (mark.type === "code") value = `\`${node.text ?? ""}\``;
        else if (mark.type === "link") value = `[${value}](${mark.attrs?.href})`;
        else throw new Error("Unsupported mark");
      }
      return value;
    }
    default:
      throw new Error("Unsupported document node");
  }
}
// Only expose a body field when conversion preserves the entire original document.
export function draftMarkdown(body: string): string | undefined {
  try {
    const document = JSON.parse(body) as Node;
    if (document.type !== "doc") return undefined;
    const markdown = render(document);
    return isDeepStrictEqual(JSON.parse(markdownBody(markdown)), document) ? markdown : undefined;
  } catch {
    return undefined;
  }
}
