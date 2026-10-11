import TurndownService from "turndown";

/**
 * Convert clipboard HTML (e.g. from Superhuman, Gmail, Docs) into clean markdown.
 *
 * This is the key step: rich sources keep their bold/italic/links/paragraphs in
 * the HTML flavor of the clipboard, NOT the plain-text flavor. Reading plain text
 * loses all of it. We convert the HTML to markdown so **bold**, *italic*, links,
 * bullets, and real paragraph breaks all survive — then the caller re-renders
 * that markdown to clean HTML for the rich-text clipboard flavor.
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

  // Disable turndown's aggressive backslash-escaping. It would turn merge tags
  // like {first_name} into {first\_name} and "C++" into "C\+\+". For email prose
  // this escaping does more harm than good — intraword underscores/asterisks are
  // not treated as emphasis by markdown renderers anyway.
  td.escape = (str: string) => str;

  // Superhuman/Gmail represent a blank line between paragraphs as an empty
  // block element holding only a <br> (e.g. <div><br></div>). Turndown would
  // otherwise drop these, jamming paragraphs together. Treat a block element
  // whose only content is a <br> as a paragraph separator.
  td.addRule("emptyBlockSpacer", {
    filter: (node) => {
      // The project tsconfig omits the DOM lib, so narrow to the props we read.
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

  // Normalize: collapse runs of 3+ newlines to a single blank line, trim NBSP.
  md = md.replace(/\u00a0/g, " ");
  md = md.replace(/[ \t]+\n/g, "\n");
  md = md.replace(/\n{3,}/g, "\n\n");

  return md.trim();
}
