import { safeMarkdown } from "./core.js";
import { literal } from "./interaction-format.js";

function prose(line: string): string {
  // Table alignment is a safe alphabet; keep colons without enabling URL schemes.
  if (/^[\t |:-]+$/.test(line)) return line;
  // Only pipe escapes survive. Other backslashes must not revive link/HTML syntax.
  return safeMarkdown(line).replace(/(?:&#92;)+\|/g, (escaped) => escaped.replaceAll("&#92;", "\\"));
}

function columns(prefix: string): number {
  return [...prefix].reduce((column, char) => column + (char === "\t" ? 4 - (column % 4) : 1), 0);
}

/** Readable Agent Markdown, with external links, images and HTML kept inert. */
export function messageMarkdown(text: string): string {
  const lines = text.split("\n");
  const output: string[] = [];
  // ponytail: track only the outer list; leave list-contained block parsing to the renderer.
  let listIndent = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const indent = columns(/^[ \t]*/.exec(line)![0]);
    if (line.trim() && indent < listIndent) listIndent = 0;
    if (!listIndent) {
      const item = /^( {0,3}(?:[-+*]|\d{1,9}[.)]))([ \t]+|$)/.exec(line);
      if (item && !/^(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,})$/.test(line.trim())) {
        const markerWidth = item[1]!.length;
        const padding = columns(item[0]) - markerWidth;
        listIndent = markerWidth + (padding >= 1 && padding <= 4 ? padding : 1);
      }
    }
    const opening = /^ {0,3}(`{3,}|~{3,})([^\r]*)(?:\r)?$/.exec(line);
    if (opening && (opening[1]![0] === "~" || !opening[2]!.includes("`"))) {
      const marker = opening[1]!;
      const closing = new RegExp(`^ {0,3}${marker[0]}{${marker.length},}[ \\t]*\\r?$`);
      let end = i + 1;
      while (end < lines.length && !closing.test(lines[end]!)) end++;
      // Re-fence the exact body, including incomplete fences and embedded markers.
      output.push(`\n${literal(lines.slice(i + 1, end).join("\n"))}\n`);
      i = end;
    } else if (!listIndent && /^(?: {4}|\t)/.test(line) && (i === 0 || /^\s*$/.test(lines[i - 1]!))) {
      let end = i + 1;
      while (end < lines.length && /^(?: {4}|\t|\s*$)/.test(lines[end]!)) end++;
      output.push(`\n${literal(lines.slice(i, end).join("\n"))}\n`);
      i = end - 1;
    } else {
      output.push(prose(line));
    }
  }
  return output.join("\n");
}
