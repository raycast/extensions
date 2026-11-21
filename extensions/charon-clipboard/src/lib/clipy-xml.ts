import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { newId } from "./ids";
import type { SnippetFolder } from "./types";

/*
 * Snippet export format of Clipy (https://github.com/Clipy/Clipy):
 *
 * <?xml version="1.0" encoding="UTF-8"?>
 * <folders>
 *   <folder>
 *     <title>Folder</title>
 *     <snippets>
 *       <snippet>
 *         <title>Snippet</title>
 *         <content>Content</content>
 *       </snippet>
 *     </snippets>
 *   </folder>
 * </folders>
 */

type RawSnippet = { title?: unknown; content?: unknown };
type RawFolder = { title?: unknown; snippets?: { snippet?: RawSnippet[] } | string };

const asText = (v: unknown): string => {
  if (v === undefined || v === null) return "";
  if (typeof v === "object") {
    // with trimValues: false, mixed whitespace shows up as "#text"
    const t = (v as Record<string, unknown>)["#text"];
    return t === undefined ? "" : String(t);
  }
  return String(v);
};

export function parseClipyXml(xml: string, makeId: () => string = newId): SnippetFolder[] {
  const parser = new XMLParser({
    ignoreAttributes: true,
    trimValues: false, // keep leading/trailing whitespace and newlines in snippets
    parseTagValue: false, // do not turn "001" into a number
    isArray: (name) => name === "folder" || name === "snippet",
  });
  const doc = parser.parse(xml) as { folders?: { folder?: RawFolder[] } | string };

  if (doc.folders === undefined) {
    throw new Error("This does not look like a Clipy snippet file (no <folders> element).");
  }
  const rawFolders = typeof doc.folders === "object" ? (doc.folders.folder ?? []) : [];

  return rawFolders.map((f) => {
    const rawSnippets = typeof f.snippets === "object" ? (f.snippets.snippet ?? []) : [];
    return {
      id: makeId(),
      title: asText(f.title).trim() || "Untitled",
      enabled: true,
      snippets: rawSnippets.map((s) => ({
        id: makeId(),
        title: asText(s.title).trim() || asText(s.content).trim().split("\n")[0].slice(0, 40) || "Untitled",
        content: asText(s.content),
      })),
    };
  });
}

export function buildClipyXml(folders: SnippetFolder[]): string {
  const builder = new XMLBuilder({ format: true, indentBy: "  ", suppressEmptyNode: false });
  const body = builder.build({
    folders: {
      folder: folders.map((f) => ({
        title: f.title,
        snippets: { snippet: f.snippets.map((s) => ({ title: s.title, content: s.content })) },
      })),
    },
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
}
