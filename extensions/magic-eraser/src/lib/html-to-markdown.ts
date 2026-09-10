import TurndownService from "turndown";

/**
 * Convert clipboard HTML into markdown. Used here as an intermediate step: it
 * decodes entities, flattens the visual text, and turns links/bold/lists into
 * simple markdown markers — which the eraser then strips entirely. Reading the
 * HTML flavor (not plain text) matters because that's where the real text and
 * structure live; plain text from apps like Notion carries literal "[ ]"
 * checkbox junk we want to remove.
 */
export function htmlToMarkdown(html: string): string {
  const td = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    strongDelimiter: "**",
    emDelimiter: "*",
    linkStyle: "inlined",
    br: "  \n",
  });

  // Disable turndown's backslash-escaping (would corrupt merge tags like
  // {first_name}). Irrelevant to the final output here since we strip markers,
  // but keeps the intermediate clean.
  td.escape = (str: string) => str;

  // Treat an empty block whose only content is a <br> as a paragraph separator,
  // so paragraph breaks survive into the stripped output.
  td.addRule("emptyBlockSpacer", {
    filter: (node) => {
      const el = node as unknown as {
        nodeName: string;
        textContent: string | null;
        children: ArrayLike<{ nodeName: string }>;
        childNodes: ArrayLike<unknown>;
      };
      const tag = el.nodeName.toLowerCase();
      if (tag !== "div" && tag !== "p") return false;
      const text = (el.textContent ?? "").replace(/\u00a0/g, " ").trim();
      const onlyBr = el.children.length === 1 && el.children[0].nodeName.toLowerCase() === "br";
      return text === "" && (onlyBr || el.childNodes.length === 0);
    },
    replacement: () => "\n\n",
  });

  let md = td.turndown(html);
  md = md.replace(/\u00a0/g, " ");
  md = md.replace(/[ \t]+\n/g, "\n");
  md = md.replace(/\n{3,}/g, "\n\n");
  return md.trim();
}
