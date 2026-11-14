// Bear 2 links an embedded image by file name alone, `![](Screenshot%201.png)`, which Raycast cannot
// load. Point each such link at the attachment's file on disk, through the note's imagePaths; an
// image whose file is not there becomes a short placeholder instead of a broken image. Links with
// a scheme (https:, file:) or an absolute path are left alone.
//
// The text is scanned rather than matched with one pattern, following CommonMark where it matters:
// fenced code blocks and code spans are copied untouched, a backslash escapes `![`, the alt text may
// hold nested brackets, and a destination may hold balanced parentheses or be written `<…>`.

function fileUrl(path: string): string {
  // encodeURIComponent leaves ( and ) alone, and an unbalanced one would end the Markdown link early
  const segment = (s: string) => encodeURIComponent(s).replace(/\(/g, "%28").replace(/\)/g, "%29");
  return "file://" + path.split("/").map(segment).join("/");
}

interface ParsedImage {
  end: number; // index just past the closing parenthesis
  alt: string; // as written, brackets and escapes included
  destination: string; // without angle brackets, escapes still in place
  title: string; // as written, leading whitespace included; "" when there is none
}

const isSpace = (ch: string | undefined) => ch === " " || ch === "\t" || ch === "\n";

// Parse `![alt](destination "title")` starting at `at`, which holds the `!`; null when it is not one.
function parseImage(text: string, at: number): ParsedImage | null {
  let i = at + 2;
  let depth = 0;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\\") i++;
    else if (ch === "[") depth++;
    else if (ch === "]") {
      if (depth === 0) break;
      depth--;
    }
  }
  if (i >= text.length || text[i + 1] !== "(") return null;
  const alt = text.slice(at + 2, i);
  i += 2;
  while (isSpace(text[i])) i++;

  let destination: string;
  if (text[i] === "<") {
    const close = text.slice(i + 1).search(/[<>\n]/);
    if (close === -1 || text[i + 1 + close] !== ">") return null;
    destination = text.slice(i + 1, i + 1 + close);
    i += close + 2;
  } else {
    const start = i;
    let parens = 0;
    for (; i < text.length; i++) {
      const ch = text[i];
      if (ch === "\\" && i + 1 < text.length) i++;
      else if (ch === "(") parens++;
      else if (ch === ")") {
        if (parens === 0) break;
        parens--;
      } else if (isSpace(ch) || ch < " ") break;
    }
    if (parens !== 0) return null;
    destination = text.slice(start, i);
  }

  const titleStart = i;
  while (isSpace(text[i])) i++;
  const opener = text[i];
  if (i > titleStart && (opener === '"' || opener === "'" || opener === "(")) {
    const closer = opener === "(" ? ")" : opener;
    for (i++; i < text.length && text[i] !== closer; i++) if (text[i] === "\\") i++;
    if (i >= text.length) return null;
    i++;
  }
  const title = text.slice(titleStart, i).trimEnd();
  while (isSpace(text[i])) i++;
  if (text[i] !== ")") return null;
  return { end: i + 1, alt, destination, title };
}

function rewriteImage(image: ParsedImage, whole: string, imagePaths: Map<string, string>): string {
  const url = image.destination;
  if (url === "" || /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("/")) return whole;
  let name = url.replace(/\\([!-/:-@[-`{-~])/g, "$1");
  try {
    name = decodeURIComponent(name);
  } catch {
    // a stray % in the name: look it up as written
  }
  const path = imagePaths.get(name.normalize("NFC"));
  if (path === undefined) return `*(image not found: ${name.replace(/[\\`*_[\]<>]/g, "\\$&")})*`;
  return `![${image.alt}](${fileUrl(path)}${image.title})`;
}

// Rewrite the images in a run of lines outside fenced code, leaving code spans alone.
function rewriteInline(text: string, imagePaths: Map<string, string>): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\\") {
      out += text.slice(i, i + 2);
      i += 2;
    } else if (ch === "`") {
      let run = 1;
      while (text[i + run] === "`") run++;
      const fence = "`".repeat(run);
      let close = text.indexOf(fence, i + run);
      while (close !== -1 && text[close + run] === "`") {
        let next = close;
        while (text[next] === "`") next++;
        close = text.indexOf(fence, next);
      }
      const end = close === -1 ? i + run : close + run;
      out += text.slice(i, end);
      i = end;
    } else if (ch === "!" && text[i + 1] === "[") {
      const image = parseImage(text, i);
      if (image === null) {
        out += "![";
        i += 2;
      } else {
        out += rewriteImage(image, text.slice(i, image.end), imagePaths);
        i = image.end;
      }
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

export function resolveBearImages(text: string, imagePaths: Map<string, string>): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let prose: string[] = [];
  let fence: { char: string; length: number } | null = null;
  const flushProse = () => {
    if (prose.length > 0) out.push(rewriteInline(prose.join("\n"), imagePaths));
    prose = [];
  };
  for (const line of lines) {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence === null) {
      // a backtick fence's info string may not hold a backtick
      if (marker && !(marker[1][0] === "`" && line.slice(marker[0].length).includes("`"))) {
        flushProse();
        fence = { char: marker[1][0], length: marker[1].length };
        out.push(line);
      } else {
        prose.push(line);
      }
    } else {
      out.push(line);
      const closes =
        marker &&
        marker[1][0] === fence.char &&
        marker[1].length >= fence.length &&
        line.slice(marker[0].length).trim() === "";
      if (closes) fence = null;
    }
  }
  flushProse();
  return out.join("\n");
}
