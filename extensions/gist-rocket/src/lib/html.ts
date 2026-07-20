import { readFile } from "node:fs/promises";
import { dirname, resolve, sep, extname, basename } from "node:path";

export type InputKind = "html" | "markdown";

export function detectKind(filenameOrContent: string, isPath = false): InputKind {
  if (isPath) {
    const ext = extname(filenameOrContent).toLowerCase();
    if (ext === ".md" || ext === ".markdown") return "markdown";
    return "html";
  }
  const trimmed = filenameOrContent.trimStart();
  if (trimmed.startsWith("<!") || trimmed.startsWith("<html") || /<[a-z][\s\S]*?>/i.test(trimmed.slice(0, 200))) {
    return "html";
  }
  return "markdown";
}

export function looksLikeFullDocument(html: string): boolean {
  return /<!doctype html|<html[\s>]/i.test(html);
}

const FRAGMENT_TEMPLATE = (body: string, title = "Untitled") => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body>
${body}
</body>
</html>
`;

export function wrapHtmlFragment(html: string, title?: string): string {
  if (looksLikeFullDocument(html)) return html;
  return FRAGMENT_TEMPLATE(html, title);
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

/**
 * Inline same-folder <script src="…"> and <link rel="stylesheet" href="…">
 * into a single self-contained HTML document. Only local, relative refs are
 * inlined — http(s) URLs are left alone so CDNs still work.
 */
export async function inlineLocalAssets(html: string, htmlPath: string): Promise<string> {
  const baseDir = dirname(htmlPath);
  let out = html;

  out = await replaceAsync(
    out,
    /<script\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi,
    async (m, pre, src, post) => {
      if (isRemote(src)) return m;
      const resolved = resolve(baseDir, src);
      if (!resolved.startsWith(baseDir + sep)) return m;
      try {
        const content = await readFile(resolved, "utf8");
        const attrs = stripTypeAttr(`${pre}${post}`).trim();
        return `<script${attrs ? " " + attrs : ""}>\n${content}\n</script>`;
      } catch {
        return m;
      }
    },
  );

  out = await replaceAsync(out, /<link\b([^>]*?)\bhref=["']([^"']+)["']([^>]*?)\/?>/gi, async (m, pre, href, post) => {
    const attrs = `${pre} ${post}`;
    if (!/rel=["']?stylesheet["']?/i.test(attrs)) return m;
    if (isRemote(href)) return m;
    const resolved = resolve(baseDir, href);
    if (!resolved.startsWith(baseDir + sep)) return m;
    try {
      const content = await readFile(resolved, "utf8");
      return `<style>\n${content}\n</style>`;
    } catch {
      return m;
    }
  });

  return out;
}

function isRemote(url: string): boolean {
  return /^(https?:)?\/\//i.test(url) || url.startsWith("data:");
}

function stripTypeAttr(attrs: string): string {
  return attrs.replace(/\btype=["'][^"']*["']/i, "").replace(/\s+/g, " ");
}

async function replaceAsync(
  str: string,
  regex: RegExp,
  asyncFn: (match: string, ...args: string[]) => Promise<string>,
): Promise<string> {
  const matches: { match: RegExpExecArray; promise: Promise<string> }[] = [];
  let m: RegExpExecArray | null;
  const g = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g");
  while ((m = g.exec(str)) !== null) {
    matches.push({ match: m, promise: asyncFn(m[0], ...m.slice(1)) });
    if (m.index === g.lastIndex) g.lastIndex++;
  }
  const replacements = await Promise.all(matches.map((x) => x.promise));
  let result = "";
  let lastIndex = 0;
  matches.forEach((x, i) => {
    result += str.slice(lastIndex, x.match.index) + replacements[i];
    lastIndex = x.match.index + x.match[0].length;
  });
  result += str.slice(lastIndex);
  return result;
}

export function suggestedTitle(content: string, fallback: string): string {
  const h1 = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1) return decodeEntities(h1[1].trim());
  const titleTag = content.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleTag) return decodeEntities(titleTag[1].trim());
  const mdH1 = content.match(/^\s*#\s+(.+?)\s*$/m);
  if (mdH1) return mdH1[1].trim();
  return fallback;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function baseFileName(p: string): string {
  return basename(p, extname(p));
}
