import { environment } from "@raycast/api";
import { marked, Renderer, TextRenderer } from "marked";
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);

// Pinned CDN assets. They are included only when the document needs them.
const MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@11.16.1/dist/mermaid.min.js";
const KATEX_CSS = "https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css";
const KATEX_JS = "https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.js";
const KATEX_AUTO = "https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/contrib/auto-render.min.js";
const HIGHLIGHT_LIGHT_CSS = "https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.11.1/styles/github.min.css";
const HIGHLIGHT_DARK_CSS = "https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.11.1/styles/github-dark.min.css";
const HIGHLIGHT_JS = "https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.11.1/highlight.min.js";
const MARKDOWN_EXTS = new Set([".md", ".markdown", ".mdown", ".mkd", ".mdx"]);
const OBSIDIAN_IMAGE_EXTS = /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i;
const AUTO_DETECT_LANGUAGES = new Set(["text", "txt", "plain", "plaintext"]);

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function decodePercentPath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function resolveLocalAssetHref(href: string, baseDir?: string): string {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("file:") || trimmed.startsWith("#")) {
    return trimmed;
  }
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) return trimmed;
  if (!baseDir && !isAbsolute(trimmed)) return trimmed;

  // Resolve only the path portion. Encoding a query/fragment as part of a file
  // name breaks paths such as image%20name.png#preview.
  const suffixIndex = trimmed.search(/[?#]/);
  const path = suffixIndex === -1 ? trimmed : trimmed.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? "" : trimmed.slice(suffixIndex);
  const decodedPath = decodePercentPath(path);
  const absolute = isAbsolute(decodedPath) ? decodedPath : resolve(baseDir ?? "/", decodedPath);
  return `${pathToFileURL(absolute).href}${suffix}`;
}

/** Return undefined for a relative URL, null for an unsafe scheme, or the allowed scheme. */
function safeLinkScheme(href: string): string | null | undefined {
  const normalized = href
    .replace(/&#x([\da-f]+);?/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&colon;?/gi, ":")
    .trim();
  const colon = normalized.indexOf(":");
  const pathSeparator = normalized.search(/[/?#]/);
  if (colon === -1 || (pathSeparator !== -1 && pathSeparator < colon)) return undefined;

  // Browsers remove ASCII whitespace/control characters while parsing schemes.
  // Inspect everything before the first colon instead of relying on a regex so
  // strings such as java&#x09;script: cannot become executable after parsing.
  const scheme = Array.from(normalized.slice(0, colon))
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code > 0x20 && (code < 0x7f || code > 0x9f);
    })
    .join("")
    .toLowerCase();
  return ["http", "https", "mailto", "file"].includes(scheme) ? scheme : null;
}

function replaceObsidianEmbedsInText(text: string): string {
  return text.replace(/!\[\[([^\]\n]+)\]\]/g, (raw, value: string) => {
    const separator = value.indexOf("|");
    const target = (separator === -1 ? value : value.slice(0, separator)).trim();
    if (!OBSIDIAN_IMAGE_EXTS.test(target)) return raw;

    const alias = separator === -1 ? "" : value.slice(separator + 1).trim();
    const alt = alias && !/^\d+(?:x\d+)?$/i.test(alias) ? alias : basename(target.split(/[?#]/)[0] ?? target);
    const escapedAlt = alt.replaceAll("\\", "\\\\").replaceAll("[", "\\[").replaceAll("]", "\\]");
    const destination = target.replace(/[\s()<>]/g, (character) => encodeURIComponent(character));
    return `![${escapedAlt}](${destination})`;
  });
}

function replaceObsidianEmbedsOutsideInlineCode(line: string): string {
  let result = "";
  let cursor = 0;
  while (cursor < line.length) {
    const codeStart = line.indexOf("`", cursor);
    if (codeStart === -1) return result + replaceObsidianEmbedsInText(line.slice(cursor));
    result += replaceObsidianEmbedsInText(line.slice(cursor, codeStart));

    let delimiterEnd = codeStart;
    while (line[delimiterEnd] === "`") delimiterEnd += 1;
    const delimiter = line.slice(codeStart, delimiterEnd);
    const codeEnd = line.indexOf(delimiter, delimiterEnd);
    if (codeEnd === -1) return result + line.slice(codeStart);
    result += line.slice(codeStart, codeEnd + delimiter.length);
    cursor = codeEnd + delimiter.length;
  }
  return result;
}

function preprocessObsidianMarkdown(markdown: string): string {
  let fenceCharacter: "`" | "~" | undefined;
  let fenceLength = 0;

  return markdown
    .split("\n")
    .map((line) => {
      const fence = line.match(/^ {0,3}(`{3,}|~{3,})/);
      if (fence?.[1]) {
        const character = fence[1][0] as "`" | "~";
        if (!fenceCharacter) {
          fenceCharacter = character;
          fenceLength = fence[1].length;
        } else if (character === fenceCharacter && fence[1].length >= fenceLength) {
          fenceCharacter = undefined;
          fenceLength = 0;
        }
        return line;
      }
      if (fenceCharacter || /^(?: {4}|\t)/.test(line)) return line;
      return replaceObsidianEmbedsOutsideInlineCode(line);
    })
    .join("\n");
}

function slugifyHeading(text: string, slugCounts: Map<string, number>): string {
  const base =
    text
      .normalize("NFKC")
      .toLowerCase()
      .trim()
      .replace(/[^\p{Letter}\p{Number}\s_-]/gu, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "section";
  const count = slugCounts.get(base) ?? 0;
  slugCounts.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

function createRenderer(baseDir?: string) {
  const renderer = new Renderer();
  const defaultCode = renderer.code.bind(renderer);
  const defaultImage = renderer.image.bind(renderer);
  const defaultLink = renderer.link.bind(renderer);
  const defaultList = renderer.list.bind(renderer);
  const defaultListItem = renderer.listitem.bind(renderer);
  const slugCounts = new Map<string, number>();

  renderer.code = (token) => {
    const language = (token.lang ?? "").trim().toLowerCase();
    if (language === "mermaid") {
      return `<div class="mermaid">${escapeHtml(token.text)}</div>\n`;
    }
    // `text` normally disables highlighting entirely. Treat common plaintext
    // labels as unspecified so highlight.js can still auto-detect pasted or
    // AI-generated code blocks that were conservatively fenced as `text`.
    return AUTO_DETECT_LANGUAGES.has(language) ? defaultCode({ ...token, lang: "" }) : defaultCode(token);
  };

  renderer.heading = (token) => {
    const html = renderer.parser.parseInline(token.tokens);
    const text = renderer.parser.parseInline(token.tokens, new TextRenderer());
    const slug = slugifyHeading(text, slugCounts);
    return `<h${token.depth} id="${escapeHtml(slug)}">${html}<a class="heading-anchor" href="#${escapeHtml(slug)}" aria-label="Link to this heading">#</a></h${token.depth}>\n`;
  };

  // Browser previews can be created from untrusted clipboard contents. Render
  // raw HTML as text so Markdown cannot inject scripts into the local page.
  renderer.html = ({ text }) => escapeHtml(text);

  renderer.image = (token) => {
    const href = resolveLocalAssetHref(token.href ?? "", baseDir);
    return defaultImage({ ...token, href });
  };

  renderer.listitem = (token) => {
    const html = defaultListItem(token);
    return token.task ? html.replace(/^<li>/, '<li class="task-list-item">') : html;
  };

  renderer.list = (token) => {
    const html = defaultList(token);
    if (!token.items.some((item) => item.task)) return html;
    return html.replace(/^<(ol|ul)([^>]*)>/, '<$1$2 class="contains-task-list">');
  };

  renderer.link = (token) => {
    const href = token.href ?? "";
    const scheme = safeLinkScheme(href);
    if (scheme === null) return defaultLink({ ...token, href: "#" });
    if (baseDir && href && !href.startsWith("#") && scheme === undefined) {
      return defaultLink({ ...token, href: resolveLocalAssetHref(href, baseDir) });
    }
    return defaultLink(token);
  };

  return renderer;
}

function markdownToBodyHtml(markdown: string, baseDir?: string): string {
  return marked.parse(preprocessObsidianMarkdown(markdown), {
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
:root,
:root[data-theme="light"] {
  color-scheme: light;
  --bg: #ffffff;
  --fg: #1f2328;
  --muted: #656d76;
  --border: #d0d7de;
  --code-bg: #f6f8fa;
  --link: #0969da;
  --quote-border: #d0d7de;
  --button-hover: #eef1f4;
  --overlay: rgba(0, 0, 0, 0.78);
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --bg: #0d1117;
  --fg: #e6edf3;
  --muted: #8b949e;
  --border: #30363d;
  --code-bg: #161b22;
  --link: #58a6ff;
  --quote-border: #3d444d;
  --button-hover: #21262d;
  --overlay: rgba(0, 0, 0, 0.88);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]):not([data-theme="dark"]) {
    color-scheme: dark;
    --bg: #0d1117;
    --fg: #e6edf3;
    --muted: #8b949e;
    --border: #30363d;
    --code-bg: #161b22;
    --link: #58a6ff;
    --quote-border: #3d444d;
    --button-hover: #21262d;
    --overlay: rgba(0, 0, 0, 0.88);
  }
}
* { box-sizing: border-box; }
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
html { font-size: 16px; scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  line-height: 1.6;
}
button, select { font: inherit; }
button:focus-visible, select:focus-visible, a:focus-visible {
  outline: 2px solid var(--link);
  outline-offset: 2px;
}
.page {
  max-width: 860px;
  margin: 0 auto;
  padding: 32px 24px 80px;
}
.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
  color: var(--muted);
  font-size: 13px;
}
.toolbar-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.toolbar-actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
.toolbar button, .toolbar select, .code-copy, .lightbox-close {
  appearance: none;
  border: 1px solid var(--border);
  background: var(--code-bg);
  color: var(--fg);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 13px;
  cursor: pointer;
}
.toolbar button:hover, .toolbar select:hover, .code-copy:hover, .lightbox-close:hover {
  background: var(--button-hover);
}
.preview-status:not(:empty) {
  color: #bf8700;
  cursor: help;
}
.markdown-body { overflow-wrap: break-word; }
.markdown-body h1, .markdown-body h2, .markdown-body h3,
.markdown-body h4, .markdown-body h5, .markdown-body h6 {
  position: relative;
  scroll-margin-top: 24px;
  margin-top: 1.4em;
}
.markdown-body h1, .markdown-body h2, .markdown-body h3 {
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.3em;
}
.heading-anchor {
  margin-left: 0.35em;
  color: var(--muted) !important;
  text-decoration: none;
  opacity: 0;
  font-weight: 400;
}
.markdown-body h1:hover .heading-anchor, .markdown-body h2:hover .heading-anchor,
.markdown-body h3:hover .heading-anchor, .markdown-body h4:hover .heading-anchor,
.markdown-body h5:hover .heading-anchor, .markdown-body h6:hover .heading-anchor,
.heading-anchor:focus { opacity: 1; }
.markdown-body a { color: var(--link); }
.markdown-body img {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  cursor: zoom-in;
}
.markdown-body blockquote {
  margin: 0;
  padding: 0 1em;
  color: var(--muted);
  border-left: 0.25em solid var(--quote-border);
}
.markdown-body hr { height: 1px; padding: 0; border: 0; background: var(--border); }
.markdown-body table { border-collapse: collapse; width: 100%; display: block; overflow-x: auto; }
.markdown-body th, .markdown-body td {
  border: 1px solid var(--border);
  padding: 6px 13px;
}
.markdown-body tr:nth-child(2n) { background: var(--code-bg); }
.markdown-body .contains-task-list { padding-left: 0; list-style: none; }
.markdown-body .task-list-item { list-style: none; }
.markdown-body .task-list-item input[type="checkbox"] {
  margin: 0 0.45em 0.25em 0;
  accent-color: var(--link);
}
.markdown-body code {
  background: var(--code-bg);
  padding: 0.2em 0.4em;
  border-radius: 6px;
  font-size: 85%;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.code-block { position: relative; margin: 1em 0; }
.markdown-body pre {
  background: var(--code-bg);
  padding: 16px;
  overflow: auto;
  border-radius: 8px;
  border: 1px solid var(--border);
}
.code-block pre { margin: 0; }
.markdown-body pre code { display: block; background: transparent; padding: 0; }
.code-copy {
  position: absolute;
  z-index: 1;
  top: 8px;
  right: 8px;
  padding: 3px 8px;
  color: var(--muted);
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease;
}
.code-block:hover .code-copy, .code-copy:focus-visible {
  opacity: 1;
  pointer-events: auto;
}
@media (hover: none) {
  .code-copy { opacity: 0.8; pointer-events: auto; }
}
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
.image-lightbox {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 48px;
  background: var(--overlay);
}
.image-lightbox[hidden] { display: none; }
.image-lightbox img {
  max-width: min(95vw, 1600px);
  max-height: 88vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 16px 60px rgba(0, 0, 0, 0.45);
}
.lightbox-close { position: fixed; top: 16px; right: 16px; }
.lightbox-caption {
  position: fixed;
  bottom: 12px;
  left: 24px;
  right: 24px;
  margin: 0;
  color: #fff;
  text-align: center;
  text-shadow: 0 1px 3px #000;
}
@media (max-width: 600px) {
  .page { padding: 20px 16px 56px; }
  .toolbar { align-items: flex-start; }
  .toolbar-title { white-space: normal; }
  .toolbar-actions { flex-wrap: wrap; justify-content: flex-end; }
  .image-lightbox { padding: 16px; }
}
`;

export function buildBrowserHtml(markdown: string, options?: { baseDir?: string; subtitle?: string }): string {
  const title = escapeHtml(extractTitle(markdown));
  const body = markdownToBodyHtml(markdown, options?.baseDir);
  const subtitle = escapeHtml(options?.subtitle ?? "Markdown Preview Clean · enhanced view");
  const nonce = randomBytes(18).toString("base64");
  const hasCode = /<pre><code(?:\s|>)/.test(body);
  const hasMermaid = body.includes('class="mermaid"');
  // A broad check avoids missing valid custom delimiters. KaTeX itself ignores
  // code/pre elements, so an occasional false positive is harmless.
  const hasMath = body.includes("$") || body.includes("\\(") || body.includes("\\[");
  const highlightStyles = hasCode
    ? `\n  <link id="syntax-light" rel="stylesheet" href="${HIGHLIGHT_LIGHT_CSS}" media="(prefers-color-scheme: light)" />\n  <link id="syntax-dark" rel="stylesheet" href="${HIGHLIGHT_DARK_CSS}" media="(prefers-color-scheme: dark)" />`
    : "";
  const katexStyle = hasMath ? `\n  <link rel="stylesheet" href="${KATEX_CSS}" />` : "";
  const featureScripts = [
    hasCode ? `<script src="${HIGHLIGHT_JS}"></script>` : "",
    hasMath ? `<script src="${KATEX_JS}"></script>\n  <script src="${KATEX_AUTO}"></script>` : "",
    hasMermaid ? `<script src="${MERMAID_CDN}"></script>` : "",
  ]
    .filter(Boolean)
    .join("\n  ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; object-src 'none'; img-src data: file: https:; style-src 'unsafe-inline' https://cdn.jsdelivr.net; script-src 'nonce-${nonce}' https://cdn.jsdelivr.net; font-src data: https://cdn.jsdelivr.net; connect-src 'none';" />
  <title>${title}</title>${katexStyle}${highlightStyles}
  <style>${PAGE_CSS}</style>
</head>
<body>
  <div class="page">
    <div class="toolbar">
      <span class="toolbar-title" title="${subtitle}">${subtitle}</span>
      <span class="toolbar-actions">
        <span id="preview-status" class="preview-status" role="status"></span>
        <label>
          <span class="visually-hidden">Theme</span>
          <select id="theme-select" aria-label="Preview theme">
            <option value="auto">Auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </span>
    </div>
    <article class="markdown-body">
${body}
    </article>
  </div>
  <div id="image-lightbox" class="image-lightbox" role="dialog" aria-modal="true" aria-label="Image preview" hidden>
    <button id="lightbox-close" class="lightbox-close" type="button" aria-label="Close image preview">Close</button>
    <img id="lightbox-image" alt="" />
    <p id="lightbox-caption" class="lightbox-caption"></p>
  </div>
  ${featureScripts}
  <script nonce="${nonce}">
    (() => {
      "use strict";
      const hasCode = ${String(hasCode)};
      const hasMath = ${String(hasMath)};
      const hasMermaid = ${String(hasMermaid)};
      const themeSelect = document.getElementById("theme-select");
      const syntaxLight = document.getElementById("syntax-light");
      const syntaxDark = document.getElementById("syntax-dark");
      const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
      const featureErrors = new Map();

      function reportFeatureError(feature, error) {
        console.warn("Markdown Preview " + feature + " error:", error);
        featureErrors.set(feature, error instanceof Error ? error.message : String(error));
        const status = document.getElementById("preview-status");
        status.textContent = "⚠ " + Array.from(featureErrors.keys()).join(", ");
        status.title = Array.from(featureErrors, ([name, message]) => name + ": " + message).join("\\n");
      }

      function readSavedTheme() {
        try {
          const saved = localStorage.getItem("markdown-preview-theme");
          return saved === "light" || saved === "dark" ? saved : "auto";
        } catch (error) {
          console.warn("Unable to read preview theme:", error);
          return "auto";
        }
      }

      function effectiveDarkTheme() {
        return themeSelect.value === "dark" || (themeSelect.value === "auto" && colorScheme.matches);
      }

      function updateSyntaxTheme() {
        if (!hasCode || !syntaxLight || !syntaxDark) return;
        const dark = effectiveDarkTheme();
        syntaxLight.media = dark ? "not all" : "all";
        syntaxDark.media = dark ? "all" : "not all";
      }

      let mermaidQueue = Promise.resolve();
      const mermaidNodes = Array.from(document.querySelectorAll(".mermaid"));
      const mermaidSources = mermaidNodes.map((node) => node.textContent || "");

      async function renderMermaid() {
        if (!hasMermaid) return;
        if (!window.mermaid) {
          reportFeatureError("Mermaid", "library failed to load");
          return;
        }
        mermaidNodes.forEach((node, index) => {
          node.removeAttribute("data-processed");
          node.textContent = mermaidSources[index] || "";
        });
        window.mermaid.initialize({
          startOnLoad: false,
          theme: effectiveDarkTheme() ? "dark" : "default",
          securityLevel: "strict"
        });
        await window.mermaid.run({ nodes: mermaidNodes });
      }

      function scheduleMermaidRender() {
        mermaidQueue = mermaidQueue
          .catch(() => undefined)
          .then(renderMermaid)
          .catch((error) => reportFeatureError("Mermaid", error));
      }

      function applyTheme(theme, save, rerenderMermaid) {
        const selected = theme === "light" || theme === "dark" ? theme : "auto";
        themeSelect.value = selected;
        if (selected === "auto") document.documentElement.removeAttribute("data-theme");
        else document.documentElement.dataset.theme = selected;
        updateSyntaxTheme();
        if (save) {
          try {
            localStorage.setItem("markdown-preview-theme", selected);
          } catch (error) {
            console.warn("Unable to save preview theme:", error);
          }
        }
        if (rerenderMermaid) scheduleMermaidRender();
      }

      applyTheme(readSavedTheme(), false, false);
      themeSelect.addEventListener("change", () => applyTheme(themeSelect.value, true, true));
      const colorSchemeChanged = () => {
        if (themeSelect.value === "auto") {
          updateSyntaxTheme();
          scheduleMermaidRender();
        }
      };
      if (colorScheme.addEventListener) colorScheme.addEventListener("change", colorSchemeChanged);
      else colorScheme.addListener(colorSchemeChanged);

      if (hasCode) {
        if (window.hljs) {
          try {
            document.querySelectorAll("pre code").forEach((element) => window.hljs.highlightElement(element));
          } catch (error) {
            reportFeatureError("Highlight", error);
          }
        } else {
          reportFeatureError("Highlight", "library failed to load");
        }
      }

      if (hasMath) {
        if (window.renderMathInElement) {
          try {
            window.renderMathInElement(document.querySelector(".markdown-body"), {
              delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "$", right: "$", display: false },
                { left: "\\\\[", right: "\\\\]", display: true },
                { left: "\\\\(", right: "\\\\)", display: false }
              ],
              throwOnError: false
            });
          } catch (error) {
            reportFeatureError("KaTeX", error);
          }
        } else {
          reportFeatureError("KaTeX", "library failed to load");
        }
      }

      if (hasMermaid) scheduleMermaidRender();

      async function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
          try {
            await navigator.clipboard.writeText(text);
            return;
          } catch (error) {
            console.warn("Clipboard API unavailable, using fallback:", error);
          }
        }
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("Browser denied clipboard access");
      }

      document.querySelectorAll("pre > code").forEach((code) => {
        const pre = code.parentElement;
        const wrapper = document.createElement("div");
        wrapper.className = "code-block";
        pre.before(wrapper);
        wrapper.appendChild(pre);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "code-copy";
        button.textContent = "Copy";
        button.setAttribute("aria-label", "Copy code block");
        button.addEventListener("click", async () => {
          try {
            await copyText((code.textContent || "").replace(/\\n$/, ""));
            button.textContent = "Copied";
            window.setTimeout(() => { button.textContent = "Copy"; }, 1500);
          } catch (error) {
            reportFeatureError("Copy", error);
          }
        });
        wrapper.appendChild(button);
      });

      const lightbox = document.getElementById("image-lightbox");
      const lightboxImage = document.getElementById("lightbox-image");
      const lightboxCaption = document.getElementById("lightbox-caption");
      let previousFocus = null;
      function closeLightbox() {
        lightbox.hidden = true;
        document.body.style.overflow = "";
        lightboxImage.removeAttribute("src");
        if (previousFocus) previousFocus.focus();
      }
      document.querySelectorAll(".markdown-body img").forEach((image) => {
        image.loading = "lazy";
        image.tabIndex = 0;
        image.setAttribute("role", "button");
        image.setAttribute("aria-label", "Open image preview: " + (image.alt || "image"));
        const openImage = () => {
          previousFocus = document.activeElement;
          lightboxImage.src = image.currentSrc || image.src;
          lightboxImage.alt = image.alt || "";
          lightboxCaption.textContent = image.alt || image.title || "";
          lightbox.hidden = false;
          document.body.style.overflow = "hidden";
          document.getElementById("lightbox-close").focus();
        };
        image.addEventListener("click", openImage);
        image.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openImage();
          }
        });
      });
      document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
      lightbox.addEventListener("click", (event) => {
        if (event.target === lightbox) closeLightbox();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !lightbox.hidden) closeLightbox();
      });

    })();
  </script>
</body>
</html>`;
}

function toAssetBaseDir(fileOrDir?: string): string | undefined {
  if (!fileOrDir) return undefined;
  return MARKDOWN_EXTS.has(extname(fileOrDir).toLowerCase()) ? dirname(fileOrDir) : fileOrDir;
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
  // A cache-busting query prevents browsers from reusing an already-open tab,
  // while retaining a single on-disk file so private previews do not accumulate.
  const previewUrl = `${pathToFileURL(outPath).href}?v=${Date.now()}`;
  await execFileAsync("open", [previewUrl]);
  return previewUrl;
}
