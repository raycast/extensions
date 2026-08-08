import { environment } from "@raycast/api";
import { marked, Renderer } from "marked";
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);

// CDN pins — good enough for local preview; needs network on first load
const MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@11.16.1/dist/mermaid.min.js";
const KATEX_CSS = "https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css";
const KATEX_JS = "https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.js";
const KATEX_AUTO = "https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/contrib/auto-render.min.js";
const HIGHLIGHT_CSS = "https://cdn.jsdelivr.net/npm/highlight.js@11.11.1/styles/github-dark.min.css";
const HIGHLIGHT_JS = "https://cdn.jsdelivr.net/npm/highlight.js@11.11.1/highlight.min.js";

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function resolveLocalAssetHref(href: string, baseDir?: string): string {
  if (!baseDir) return href;
  if (!href || href.startsWith("data:") || href.startsWith("file:")) return href;
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(href)) return href; // http(s), mailto, etc.
  if (href.startsWith("#")) return href;

  const absolute = isAbsolute(href) ? href : resolve(baseDir, href);
  return pathToFileURL(absolute).href;
}

function createRenderer(baseDir?: string) {
  const renderer = new Renderer();
  const defaultCode = renderer.code.bind(renderer);
  const defaultImage = renderer.image.bind(renderer);
  const defaultLink = renderer.link.bind(renderer);

  renderer.code = (token) => {
    const language = (token.lang ?? "").trim().toLowerCase();
    if (language === "mermaid") {
      return `<div class="mermaid">${escapeHtml(token.text)}</div>\n`;
    }
    return defaultCode(token);
  };

  // Browser previews can be created from untrusted clipboard contents. Render
  // raw HTML as text so Markdown cannot inject scripts into the local page.
  renderer.html = ({ text }) => escapeHtml(text);

  renderer.image = (token) => {
    const href = resolveLocalAssetHref(token.href ?? "", baseDir);
    return defaultImage({ ...token, href });
  };

  renderer.link = (token) => {
    const href = token.href ?? "";
    const decodedHref = href
      .replace(/&#x([\da-f]+);?/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
      .replace(/&#(\d+);?/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
      .replace(/&colon;/gi, ":")
      .trim();
    const scheme = decodedHref.match(/^([a-zA-Z][a-zA-Z\d+\-.]*):/)?.[1]?.toLowerCase();
    if (scheme && !["http", "https", "mailto", "file"].includes(scheme)) {
      return defaultLink({ ...token, href: "#" });
    }
    // Only rewrite likely-local relative file links
    if (baseDir && href && !href.startsWith("#") && !scheme) {
      return defaultLink({ ...token, href: resolveLocalAssetHref(href, baseDir) });
    }
    return defaultLink(token);
  };

  return renderer;
}

function markdownToBodyHtml(markdown: string, baseDir?: string): string {
  return marked.parse(markdown, {
    breaks: true,
    gfm: true,
    renderer: createRenderer(baseDir),
    async: false,
  }) as string;
}

function extractTitle(markdown: string): string {
  const heading = markdown.match(/^#{1,6}\s+(.+)$/m);
  if (heading?.[1]) {
    return heading[1].replace(/[*_`]/g, "").trim().slice(0, 80);
  }
  const line = markdown
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean);
  return line ? line.slice(0, 60) : "Markdown Preview";
}

const PAGE_CSS = `
:root {
  color-scheme: light dark;
  --bg: #ffffff;
  --fg: #1f2328;
  --muted: #656d76;
  --border: #d0d7de;
  --code-bg: #f6f8fa;
  --link: #0969da;
  --quote-border: #d0d7de;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0d1117;
    --fg: #e6edf3;
    --muted: #8b949e;
    --border: #30363d;
    --code-bg: #161b22;
    --link: #2f81f7;
    --quote-border: #3d444d;
  }
}
* { box-sizing: border-box; }
html { font-size: 16px; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  line-height: 1.6;
}
.page {
  max-width: 860px;
  margin: 0 auto;
  padding: 32px 24px 80px;
}
.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
  color: var(--muted);
  font-size: 13px;
}
.toolbar button {
  appearance: none;
  border: 1px solid var(--border);
  background: var(--code-bg);
  color: var(--fg);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 13px;
  cursor: pointer;
}
.markdown-body h1, .markdown-body h2, .markdown-body h3 {
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.3em;
  margin-top: 1.4em;
}
.markdown-body a { color: var(--link); }
.markdown-body img { max-width: 100%; height: auto; border-radius: 6px; }
.markdown-body blockquote {
  margin: 0;
  padding: 0 1em;
  color: var(--muted);
  border-left: 0.25em solid var(--quote-border);
}
.markdown-body table { border-collapse: collapse; width: 100%; display: block; overflow-x: auto; }
.markdown-body th, .markdown-body td {
  border: 1px solid var(--border);
  padding: 6px 13px;
}
.markdown-body code {
  background: var(--code-bg);
  padding: 0.2em 0.4em;
  border-radius: 6px;
  font-size: 85%;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.markdown-body pre {
  background: var(--code-bg);
  padding: 16px;
  overflow: auto;
  border-radius: 8px;
  border: 1px solid var(--border);
}
.markdown-body pre code { background: transparent; padding: 0; }
.markdown-body .mermaid {
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  margin: 1em 0;
  text-align: center;
  overflow-x: auto;
}
.katex-display { overflow-x: auto; overflow-y: hidden; }
@media print {
  .toolbar { display: none; }
  .page { max-width: none; padding: 0; }
}
`;

export function buildBrowserHtml(markdown: string, options?: { baseDir?: string; subtitle?: string }): string {
  const title = escapeHtml(extractTitle(markdown));
  const body = markdownToBodyHtml(markdown, options?.baseDir);
  const subtitle = escapeHtml(options?.subtitle ?? "Markdown Preview Clean · enhanced view");
  const themeScript = `const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: file: https:; style-src 'unsafe-inline' https://cdn.jsdelivr.net; script-src 'unsafe-inline' https://cdn.jsdelivr.net; font-src data: https://cdn.jsdelivr.net; connect-src 'none';" />
  <title>${title}</title>
  <link rel="stylesheet" href="${KATEX_CSS}" />
  <link rel="stylesheet" href="${HIGHLIGHT_CSS}" />
  <style>${PAGE_CSS}</style>
</head>
<body>
  <div class="page">
    <div class="toolbar">
      <span>${subtitle}</span>
      <span>
        <button type="button" onclick="window.print()">Print / PDF</button>
      </span>
    </div>
    <article class="markdown-body">
${body}
    </article>
  </div>
  <script src="${HIGHLIGHT_JS}"></script>
  <script src="${KATEX_JS}"></script>
  <script src="${KATEX_AUTO}"></script>
  <script src="${MERMAID_CDN}"></script>
  <script>
    ${themeScript}
    try {
      document.querySelectorAll("pre code").forEach((el) => {
        if (window.hljs) window.hljs.highlightElement(el);
      });
    } catch (e) {}
    try {
      if (window.renderMathInElement) {
        window.renderMathInElement(document.body, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\\\[", right: "\\\\]", display: true },
            { left: "\\\\(", right: "\\\\)", display: false }
          ],
          throwOnError: false
        });
      }
    } catch (e) {}
    try {
      if (window.mermaid) {
        window.mermaid.initialize({
          startOnLoad: true,
          theme: dark ? "dark" : "default",
          securityLevel: "strict"
        });
      }
    } catch (e) {}
  </script>
</body>
</html>`;
}

function toAssetBaseDir(fileOrDir?: string): string | undefined {
  if (!fileOrDir) return undefined;
  const lower = fileOrDir.toLowerCase();
  if (lower.endsWith(".md") || lower.endsWith(".markdown") || lower.endsWith(".mdx") || lower.endsWith(".mdown")) {
    return dirname(fileOrDir);
  }
  return fileOrDir;
}

export async function openMarkdownInBrowser(
  markdown: string,
  options?: { /** Absolute path to the .md file, or its directory */ filePath?: string; subtitle?: string },
): Promise<string> {
  const html = buildBrowserHtml(markdown, {
    baseDir: toAssetBaseDir(options?.filePath),
    subtitle: options?.subtitle,
  });
  const dir = join(environment.supportPath, "browser-previews");
  await mkdir(dir, { recursive: true });
  const outPath = join(dir, "preview.html");
  await writeFile(outPath, html, "utf8");
  await execFileAsync("open", [outPath]);
  return pathToFileURL(outPath).href;
}
