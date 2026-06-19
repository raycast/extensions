import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js/lib/common";
import dart from "highlight.js/lib/languages/dart";
import powershell from "highlight.js/lib/languages/powershell";
import { escapeHtml, suggestedTitle } from "./html";

export type Theme = "light" | "dark" | "auto";

hljs.registerLanguage("dart", dart);
hljs.registerLanguage("powershell", powershell);
hljs.registerAliases(["ps", "ps1"], { languageName: "powershell" });

let markedConfigured = false;
function configureMarked() {
  if (markedConfigured) return;
  marked.use({ gfm: true, breaks: false });
  marked.use(
    markedHighlight({
      langPrefix: "hljs language-",
      highlight(code, lang) {
        const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
        try {
          return hljs.highlight(code, { language }).value;
        } catch {
          return escapeHtml(code);
        }
      },
    }),
  );
  markedConfigured = true;
}

export async function renderMarkdownToHtml(markdown: string, opts: { title?: string; theme: Theme }): Promise<string> {
  configureMarked();
  const body = await marked.parse(markdown);
  const title = opts.title ?? suggestedTitle(markdown, "Untitled");
  const themeAttr = opts.theme === "auto" ? "" : ` data-theme="${opts.theme}"`;
  return `<!doctype html>
<html lang="en"${themeAttr}>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${BASE_STYLES}${HLJS_STYLES}${TOGGLE_STYLES}</style>
</head>
<body>
<button class="gr-theme-toggle" type="button" aria-label="Toggle dark mode">
  <svg class="gr-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><g><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.2" y1="4.2" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.8" y2="19.8"/><line x1="4.2" y1="19.8" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.8" y2="4.2"/></g></svg>
  <svg class="gr-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
</button>
<main class="markdown-body">
${body}
</main>
<script>${TOGGLE_SCRIPT}</script>
</body>
</html>
`;
}

// CSS variables: base palette + syntax-highlight palette. Flipping data-theme
// (or matching prefers-color-scheme when no attribute is set) swaps every
// value below — so the theme toggle re-colors body text *and* code blocks
// with no JS beyond setting the attribute.
const BASE_STYLES = `
:root {
  --md-bg: #ffffff;
  --md-fg: #1f2328;
  --md-muted: #59636e;
  --md-link: #0969da;
  --md-border: #d1d9e0;
  --md-code-bg: #f6f8fa;
  --md-code-fg: #1f2328;
  --md-blockquote: #59636e;
  --md-table-stripe: #f6f8fa;
  --syn-comment: #6e7781;
  --syn-keyword: #cf222e;
  --syn-string: #0a3069;
  --syn-number: #0550ae;
  --syn-name: #953800;
  --syn-fn: #8250df;
  --syn-type: #953800;
  --syn-meta: #116329;
  --syn-deletion-bg: #ffebe9;
  --syn-deletion-fg: #82071e;
  --syn-insertion-bg: #dafbe1;
  --syn-insertion-fg: #116329;
}
:root[data-theme="dark"] {
  --md-bg: #0d1117;
  --md-fg: #e6edf3;
  --md-muted: #9198a1;
  --md-link: #4493f8;
  --md-border: #3d444d;
  --md-code-bg: #151b23;
  --md-code-fg: #e6edf3;
  --md-blockquote: #9198a1;
  --md-table-stripe: #151b23;
  --syn-comment: #8b949e;
  --syn-keyword: #ff7b72;
  --syn-string: #a5d6ff;
  --syn-number: #79c0ff;
  --syn-name: #ffa657;
  --syn-fn: #d2a8ff;
  --syn-type: #ffa657;
  --syn-meta: #7ee787;
  --syn-deletion-bg: #67060c;
  --syn-deletion-fg: #ffdcd7;
  --syn-insertion-bg: #033a16;
  --syn-insertion-fg: #aff5b4;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --md-bg: #0d1117;
    --md-fg: #e6edf3;
    --md-muted: #9198a1;
    --md-link: #4493f8;
    --md-border: #3d444d;
    --md-code-bg: #151b23;
    --md-code-fg: #e6edf3;
    --md-blockquote: #9198a1;
    --md-table-stripe: #151b23;
    --syn-comment: #8b949e;
    --syn-keyword: #ff7b72;
    --syn-string: #a5d6ff;
    --syn-number: #79c0ff;
    --syn-name: #ffa657;
    --syn-fn: #d2a8ff;
    --syn-type: #ffa657;
    --syn-meta: #7ee787;
    --syn-deletion-bg: #67060c;
    --syn-deletion-fg: #ffdcd7;
    --syn-insertion-bg: #033a16;
    --syn-insertion-fg: #aff5b4;
  }
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--md-bg); color: var(--md-fg); }
body {
  font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  transition: background 0.15s ease, color 0.15s ease;
}
.markdown-body {
  max-width: 800px;
  margin: 0 auto;
  padding: 48px 24px 96px;
  word-wrap: break-word;
}
.markdown-body > *:first-child { margin-top: 0; }
.markdown-body > *:last-child { margin-bottom: 0; }
.markdown-body h1, .markdown-body h2, .markdown-body h3,
.markdown-body h4, .markdown-body h5, .markdown-body h6 {
  margin: 1.6em 0 0.6em;
  font-weight: 600;
  line-height: 1.25;
}
.markdown-body h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid var(--md-border); }
.markdown-body h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid var(--md-border); }
.markdown-body h3 { font-size: 1.25em; }
.markdown-body h4 { font-size: 1em; }
.markdown-body h5 { font-size: 0.875em; }
.markdown-body h6 { font-size: 0.85em; color: var(--md-muted); }
.markdown-body p, .markdown-body ul, .markdown-body ol, .markdown-body blockquote, .markdown-body pre, .markdown-body table {
  margin: 0 0 16px;
}
.markdown-body a { color: var(--md-link); text-decoration: none; }
.markdown-body a:hover { text-decoration: underline; }
.markdown-body code {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.9em;
  padding: 0.2em 0.4em;
  background: var(--md-code-bg);
  border-radius: 6px;
}
.markdown-body pre {
  background: var(--md-code-bg);
  color: var(--md-code-fg);
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.9em;
  line-height: 1.45;
  border: 1px solid var(--md-border);
}
.markdown-body pre code { padding: 0; background: transparent; border-radius: 0; font-size: inherit; }
.markdown-body blockquote {
  margin-left: 0;
  padding: 0 1em;
  border-left: 4px solid var(--md-border);
  color: var(--md-blockquote);
}
.markdown-body ul, .markdown-body ol { padding-left: 2em; }
.markdown-body li + li { margin-top: 0.25em; }
.markdown-body table { border-collapse: collapse; width: 100%; display: block; overflow-x: auto; }
.markdown-body th, .markdown-body td { border: 1px solid var(--md-border); padding: 6px 13px; }
.markdown-body tr:nth-child(2n) { background: var(--md-table-stripe); }
.markdown-body img { max-width: 100%; }
.markdown-body hr { border: none; border-top: 1px solid var(--md-border); margin: 24px 0; }
.markdown-body kbd {
  display: inline-block;
  padding: 3px 5px;
  font-size: 0.8em;
  line-height: 10px;
  color: var(--md-fg);
  background: var(--md-code-bg);
  border: 1px solid var(--md-border);
  border-radius: 6px;
  box-shadow: inset 0 -1px 0 var(--md-border);
}
`;

const HLJS_STYLES = `
.hljs { background: transparent; color: var(--md-code-fg); }
.hljs-comment, .hljs-quote { color: var(--syn-comment); font-style: italic; }
.hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-section, .hljs-link { color: var(--syn-keyword); }
.hljs-string, .hljs-attr, .hljs-symbol, .hljs-bullet, .hljs-addition { color: var(--syn-string); }
.hljs-number, .hljs-regexp, .hljs-template-variable, .hljs-variable { color: var(--syn-number); }
.hljs-title, .hljs-title.function_, .hljs-title.class_ { color: var(--syn-fn); }
.hljs-name, .hljs-tag, .hljs-selector-id, .hljs-selector-class, .hljs-selector-attr, .hljs-selector-pseudo { color: var(--syn-name); }
.hljs-type, .hljs-built_in, .hljs-builtin-name, .hljs-class .hljs-title, .hljs-params { color: var(--syn-type); }
.hljs-meta, .hljs-meta .hljs-keyword, .hljs-doctag { color: var(--syn-meta); }
.hljs-emphasis { font-style: italic; }
.hljs-strong { font-weight: 700; }
.hljs-deletion { color: var(--syn-deletion-fg); background-color: var(--syn-deletion-bg); }
.hljs-addition { color: var(--syn-insertion-fg); background-color: var(--syn-insertion-bg); }
`;

const TOGGLE_STYLES = `
.gr-theme-toggle {
  position: fixed;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 999px;
  border: 1px solid var(--md-border);
  background: var(--md-bg);
  color: var(--md-fg);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}
.gr-theme-toggle:hover { transform: scale(1.06); }
.gr-theme-toggle:focus-visible { outline: 2px solid var(--md-link); outline-offset: 2px; }
.gr-theme-toggle svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.gr-theme-toggle .gr-sun { display: none; }
.gr-theme-toggle .gr-moon { display: block; }
.gr-theme-toggle[data-mode="dark"] .gr-sun { display: block; }
.gr-theme-toggle[data-mode="dark"] .gr-moon { display: none; }
@media (prefers-reduced-motion: reduce) {
  .gr-theme-toggle, body { transition: none; }
}
`;

const TOGGLE_SCRIPT = `(function(){
  var KEY='gr-theme';
  var root=document.documentElement;
  var btn=document.querySelector('.gr-theme-toggle');
  if(!btn) return;
  var stored=null;
  try { stored=localStorage.getItem(KEY); } catch(e){}
  if(stored==='light'||stored==='dark'){ root.setAttribute('data-theme',stored); }
  function current(){
    var a=root.getAttribute('data-theme');
    if(a==='light'||a==='dark') return a;
    return (window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';
  }
  function sync(){ btn.setAttribute('data-mode',current()); }
  btn.addEventListener('click',function(){
    var next=current()==='dark'?'light':'dark';
    root.setAttribute('data-theme',next);
    try { localStorage.setItem(KEY,next); } catch(e){}
    sync();
  });
  if(window.matchMedia){
    var mql=matchMedia('(prefers-color-scheme: dark)');
    var listener=function(){ if(!root.getAttribute('data-theme')) sync(); };
    if(mql.addEventListener) mql.addEventListener('change',listener);
    else if(mql.addListener) mql.addListener(listener);
  }
  sync();
})();`;
