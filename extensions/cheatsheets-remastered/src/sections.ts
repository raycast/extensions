import { stripFrontmatter } from "./markdown";
export interface SheetSection {
  id: string;
  title: string;
  context: string;
  line: number;
  source: string;
}

// Source offsets are used for copying; no Markdown reconstruction or whitespace normalisation.
export function sheetSections(source: string): SheetSection[] {
  const body = stripFrontmatter(source);
  const base = source.length - body.length;
  const lines = body.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const headings: { start: number; title: string; level: number; line: number }[] = [];
  let offset = base,
    fence = "",
    fenceLength = 0;
  const baseLine = source.slice(0, base).split("\n").length;
  let paragraph: { start: number; title: string; line: number } | undefined;
  let inComment = false;
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].replace(/\r?\n$/, "");
    if (!fence && (inComment || /^ {0,3}<!--/.test(text))) {
      inComment = !text.includes("-->");
      paragraph = undefined;
      offset += lines[i].length;
      continue;
    }
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(text);
    if (marker) {
      if (!fence) {
        fence = marker[1][0];
        fenceLength = marker[1].length;
      } else if (marker[1][0] === fence && marker[1].length >= fenceLength && !marker[2].trim()) fence = "";
      paragraph = undefined;
    } else if (!fence) {
      const atx = /^ {0,3}(#{1,6})(?:[ \t]+(.*)|[ \t]*)$/.exec(text);
      const setext = /^ {0,3}(=+|-+)[ \t]*$/.exec(text);
      if (atx) {
        headings.push({
          start: offset,
          title: (atx[2] || "Untitled section").replace(/[ \t]+#+[ \t]*$/, ""),
          level: atx[1].length,
          line: baseLine + i,
        });
        paragraph = undefined;
      } else if (setext && paragraph) {
        headings.push({
          ...paragraph,
          level: setext[1][0] === "=" ? 1 : 2,
        });
        paragraph = undefined;
      } else if (
        setext ||
        !text.trim() ||
        (!paragraph && /^(?: {4}|\t)/.test(text)) ||
        /^ {0,3}(?:>|[-*+]\s|\d+[.)]\s)/.test(text) ||
        (!paragraph && /^ {0,3}\[[^\]]+\]:[ \t]*\S/.test(text)) ||
        /^ {0,3}(?:\*(?:[ \t]*\*){2,}|_(?:[ \t]*_){2,}|-(?:[ \t]*-){2,})[ \t]*$/.test(text)
      ) {
        paragraph = undefined;
      } else if (paragraph) {
        paragraph.title += ` ${text.trim()}`;
      } else {
        paragraph = { start: offset, title: text.trim(), line: baseLine + i };
      }
    }
    offset += lines[i].length;
  }
  if (!headings.length) return [{ id: "0", title: "Entire sheet", context: "", line: 1, source }];
  if (source.slice(base, headings[0].start).trim())
    headings.unshift({ start: base, title: "Introduction", level: 0, line: baseLine });
  const parents: { title: string; level: number }[] = [];
  return headings.map((heading, i) => {
    while (parents.length && parents.at(-1)!.level >= heading.level) parents.pop();
    const context = parents.map((p) => p.title).join(" › ");
    parents.push(heading);
    return {
      id: String(heading.start),
      title: heading.title,
      context,
      line: heading.line,
      source: source.slice(heading.start, headings[i + 1]?.start ?? source.length),
    };
  });
}
