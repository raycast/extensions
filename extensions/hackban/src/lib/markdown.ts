import type { Nodes, Parents, PhrasingContent } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown, gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import { gfm } from "micromark-extension-gfm";
import { visit } from "unist-util-visit";

// Links may only go to the web or to mail, as DOMPurify allows on Hackban's web app.
const safeUrl = (url: string) => (/^(https?:\/\/|mailto:)/i.test(url) ? url : "#");

const FLOW_PARENTS = new Set(["root", "blockquote", "listItem", "footnoteDefinition"]);

/** What to put in place of `node`, or undefined to keep it (after fixing up its URL). */
function replacement(node: Nodes, parent: Parents): Nodes | undefined {
  switch (node.type) {
    case "link":
    case "definition":
      node.url = safeUrl(node.url);
      return;
    case "image":
      return { type: "link", url: safeUrl(node.url), title: node.title, children: [text(node.alt || node.url)] };
    case "imageReference":
      return {
        type: "linkReference",
        identifier: node.identifier,
        label: node.label,
        referenceType: node.referenceType,
        children: [text(node.alt ?? "")],
      };
    case "html":
      // Shown as the text it is, not rendered.
      return FLOW_PARENTS.has(parent.type) ? { type: "paragraph", children: [text(node.value)] } : text(node.value);
  }
}

const text = (value: string): PhrasingContent => ({ type: "text", value });

/** `md` as a code block: nothing inside is parsed, so nothing in it can link or load. */
function asCode(md: string) {
  const longest = (md.match(/`+/g) ?? []).reduce((n, run) => Math.max(n, run.length), 0);
  const fence = "`".repeat(Math.max(3, longest + 1));
  return `${fence}\n${md}\n${fence}`;
}

/**
 * Markdown other people wrote, made safe for a Detail view. It's parsed and written back out, so Raycast
 * only ever sees plain, canonical Markdown whose every link went through `safeUrl`. Images become links
 * (Raycast would fetch them as soon as the card opens), and raw HTML shows as text.
 */
export function safeMarkdown(md: string) {
  try {
    const tree = fromMarkdown(md, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
    visit(tree, (node, index, parent) => {
      if (!parent || index === undefined) return;
      const next = replacement(node, parent);
      if (next) (parent.children as Nodes[])[index] = next;
    });
    return toMarkdown(tree, { extensions: [gfmToMarkdown()], bullet: "-", rule: "-" });
  } catch {
    // Thousands of nested ">" or "*" (well within Hackban's length limits) overflow the stack.
    return asCode(md);
  }
}
