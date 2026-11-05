import { marked } from "marked";
import { strings } from "./strings";
import { parseTimecode } from "./timecode";

export type Note = {
  timecode: string;
  seconds: number;
  image?: string;
  comment: string;
};

// Entries in file order: timecoded notes and untimed text — "## --" and any other "## …" sections.
export type Entry = ({ kind: "note" } & Note) | { kind: "text"; markdown: string };

export type Notes = {
  title: string;
  intro: string;
  entries: Entry[];
};

// Heading of a general note without a timecode.
export const GENERAL_HEADING = "## --";

const HEADING = /^##\s+(\d{1,2}(?::\d{2}){1,2})\s*(.*)$/;
const SECTION = /^##\s/;
const IMAGE = /^!\[[^\]]*\]\(([^)\s]+)\)\s*$/;
const FENCE = /^\s{0,3}(`{3,}|~{3,})/;

// A literal "%" in a file name is not valid percent-encoding.
function decodePath(path: string): string {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

// Relative image paths that the page shows, for the archive; code examples are skipped.
export function localImages(markdown: string): string[] {
  const paths: string[] = [];
  marked.walkTokens(marked.lexer(markdown), (token) => {
    if (token.type === "image") paths.push(decodePath(token.href));
  });
  return [...new Set(paths)].filter(
    (path) => !/^[a-z][a-z\d+.-]*:/i.test(path) && !path.startsWith("/") && !path.split("/").includes(".."),
  );
}

export function parseNotes(markdown: string, fallbackTitle: string): Notes {
  let title = fallbackTitle;
  const intro: string[] = [];
  const entries: { lines: string[]; note?: Note }[] = [];
  let current: { lines: string[]; note?: Note } | undefined;
  // Fence character of an open code block: headings inside it are plain text.
  let fence: string | undefined;

  for (const line of markdown.split("\n")) {
    const fenceMatch = line.match(FENCE);
    if (fenceMatch) {
      const char = fenceMatch[1][0];
      if (fence === undefined) fence = char;
      else if (fence === char) fence = undefined;
    } else if (fence !== undefined) {
      (current ? current.lines : intro).push(line);
      continue;
    }
    const heading = line.match(HEADING);
    if (heading) {
      // Keep text after the timecode in the heading as the first line of the comment.
      const lines = heading[2] ? [`**${heading[2]}**`, ""] : [];
      current = { lines, note: { timecode: heading[1], seconds: parseTimecode(heading[1]), comment: "" } };
      entries.push(current);
      continue;
    }
    if (SECTION.test(line)) {
      current = { lines: line.trim() === GENERAL_HEADING ? [] : [line] };
      entries.push(current);
      continue;
    }
    if (!current) {
      if (line.startsWith("# ") && title === fallbackTitle && intro.every((l) => !l.trim()))
        title = line.slice(2).trim();
      else intro.push(line);
      continue;
    }
    const image = current.note && !current.note.image && line.match(IMAGE);
    if (image && current.note) current.note.image = decodePath(image[1]);
    else current.lines.push(line);
  }

  return {
    title,
    intro: intro.join("\n").trim(),
    entries: entries.flatMap(({ lines, note }): Entry[] => {
      const text = lines.join("\n").trim();
      if (note) return [{ kind: "note", ...note, comment: text }];
      return text ? [{ kind: "text", markdown: text }] : [];
    }),
  };
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");

const markdown = (value: string) => marked.parse(value, { async: false });

function timeLink(recordingUrl: string | undefined, note: Note): string {
  if (!recordingUrl) return escapeHtml(note.timecode);
  const url = new URL(recordingUrl);
  url.searchParams.set("t", String(note.seconds));
  return `<a href="${escapeHtml(url.toString())}" target="_blank">${escapeHtml(note.timecode)}</a>`;
}

export function renderHtml({ title, intro, entries }: Notes, recordingUrl: string | undefined): string {
  const rows = entries
    .map((entry) => {
      if (entry.kind === "text") return `<tr class="text">\n  <td colspan="3">${markdown(entry.markdown)}</td>\n</tr>`;
      const image = entry.image
        ? `<a href="${encodePath(entry.image)}" target="_blank"><img src="${encodePath(entry.image)}" alt="${escapeHtml(entry.timecode)}"></a>`
        : "";
      return `<tr>
  <td class="shot">${image}</td>
  <td class="time">${timeLink(recordingUrl, entry)}</td>
  <td class="comment">${markdown(entry.comment)}</td>
</tr>`;
    })
    .join("\n");

  const recording = recordingUrl
    ? `<p class="recording"><a href="${escapeHtml(recordingUrl)}" target="_blank">${strings.htmlRecording}</a></p>`
    : "";

  const table = entries.length
    ? `<table>
<thead><tr><th>${strings.htmlShot}</th><th>${strings.htmlTime}</th><th>${strings.htmlComment}</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body { font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1d1d1f; margin: 32px auto; max-width: 1200px; padding: 0 24px; }
  h1 { font-size: 26px; margin: 0 0 8px; }
  h2 { font-size: 20px; margin: 40px 0 12px; }
  a { color: #0066cc; }
  table { border-collapse: collapse; width: 100%; margin-top: 24px; }
  th { text-align: left; font-weight: 600; color: #6e6e73; border-bottom: 1px solid #d2d2d7; padding: 8px 12px; }
  td { vertical-align: top; border-bottom: 1px solid #e8e8ed; padding: 12px; }
  td.shot { width: 360px; }
  td.shot img { display: block; width: 360px; border-radius: 6px; border: 1px solid #e8e8ed; }
  td.time { white-space: nowrap; font-variant-numeric: tabular-nums; font-weight: 600; }
  td > :first-child { margin-top: 0; }
  td > :last-child { margin-bottom: 0; }
  td.comment img, tr.text img { max-width: 100%; }
  tr.text h2 { margin: 16px 0 0; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${recording}
${intro ? markdown(intro) : ""}
${table}
</body>
</html>
`;
}
