import { safeMarkdown } from "./core.js";
import { literal } from "./interaction-format.js";

function prose(line: string): string {
  // Table alignment is a safe alphabet; keep colons without enabling URL schemes.
  if (/^[\t |:-]+$/.test(line)) return line;
  // Only pipe escapes survive. Other backslashes must not revive link/HTML syntax.
  return safeMarkdown(line).replace(/(?:&#92;)+\|/g, (escaped) => escaped.replaceAll("&#92;", "\\"));
}

/** Readable Agent Markdown, with external links, images and HTML kept inert. */
export function messageMarkdown(text: string): string {
  const lines = text.split("\n");
  const output: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const opening = /^ {0,3}(`{3,}|~{3,})([^\r]*)(?:\r)?$/.exec(line);
    if (opening && (opening[1]![0] === "~" || !opening[2]!.includes("`"))) {
      const marker = opening[1]!;
      const closing = new RegExp(`^ {0,3}${marker[0]}{${marker.length},}[ \\t]*\\r?$`);
      let end = i + 1;
      while (end < lines.length && !closing.test(lines[end]!)) end++;
      // Re-fence the exact body, including incomplete fences and embedded markers.
      output.push(`\n${literal(lines.slice(i + 1, end).join("\n"))}\n`);
      i = end;
    } else if (/^(?: {4}|\t)/.test(line) && (i === 0 || /^\s*$/.test(lines[i - 1]!))) {
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
