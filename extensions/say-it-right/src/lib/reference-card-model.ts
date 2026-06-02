export interface ReferenceCardMetadata {
  title: string;
  text?: string;
}

export interface ReferenceCardInput {
  title: string;
  eyebrow?: string;
  sourceTitle?: string;
  sourceText?: string;
  outputTitle?: string;
  outputText?: string;
  coachingTitle?: string;
  coaching?: string;
  markdown?: string;
  metadata?: ReferenceCardMetadata[];
}

export function renderReferenceCardHtml(input: ReferenceCardInput): string {
  const metadata = (input.metadata ?? []).filter((item) => item.text);
  const primaryCopyText =
    input.outputText ?? input.markdown ?? input.sourceText ?? "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)}</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f8f7f2;
      --paper: #fffdf7;
      --ink: #1c1b18;
      --muted: #6c675f;
      --line: #ded8ca;
      --accent: #136f63;
      --accent-soft: #e1f3ee;
      --code: #f1ede3;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #151715;
        --paper: #20231f;
        --ink: #f2efe6;
        --muted: #b8b1a4;
        --line: #3a3d35;
        --accent: #7dd3c7;
        --accent-soft: #183a36;
        --code: #151815;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main {
      width: min(860px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 24px 0 48px;
    }
    .paper {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 28px;
      box-shadow: 0 18px 45px rgba(0, 0, 0, 0.10);
    }
    .eyebrow {
      color: var(--accent);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    h1, h2, h3 { line-height: 1.25; margin: 0; }
    h1 { font-size: clamp(28px, 6vw, 48px); margin-top: 8px; }
    h2 { font-size: 18px; margin-top: 28px; }
    h3 { font-size: 16px; margin-top: 22px; }
    p { margin: 10px 0 0; }
    blockquote {
      margin: 12px 0 0;
      border-left: 4px solid var(--accent);
      padding: 10px 14px;
      background: var(--accent-soft);
      border-radius: 0 6px 6px 0;
    }
    pre {
      margin: 12px 0 0;
      padding: 14px;
      overflow: auto;
      background: var(--code);
      border: 1px solid var(--line);
      border-radius: 6px;
      font-size: 14px;
      line-height: 1.45;
      white-space: pre-wrap;
    }
    code {
      background: var(--code);
      border-radius: 4px;
      padding: 1px 4px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    .answer {
      margin-top: 14px;
      font-size: clamp(24px, 5vw, 40px);
      line-height: 1.25;
      font-weight: 750;
    }
    .source {
      color: var(--muted);
      font-size: 17px;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 22px;
      padding: 0;
      list-style: none;
    }
    .meta li {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 4px 10px;
      color: var(--muted);
      font-size: 13px;
    }
    .actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 22px;
    }
    button {
      border: 1px solid var(--line);
      background: var(--paper);
      color: var(--ink);
      border-radius: 6px;
      padding: 7px 10px;
      font: inherit;
      font-size: 13px;
      cursor: pointer;
    }
    button.primary {
      border-color: var(--accent);
      background: var(--accent);
      color: var(--paper);
    }
    hr {
      border: 0;
      border-top: 1px solid var(--line);
      margin: 22px 0;
    }
  </style>
</head>
<body>
  <main>
    <article class="paper">
      ${input.eyebrow ? `<div class="eyebrow">${escapeHtml(input.eyebrow)}</div>` : ""}
      <h1>${escapeHtml(input.title)}</h1>
      ${renderMetadata(metadata)}
      ${renderCopyActions(primaryCopyText, input.sourceText)}
      ${renderSource(input)}
      ${renderOutput(input)}
      ${renderCoaching(input)}
      ${input.markdown ? `<section>${markdownToHtml(input.markdown)}</section>` : ""}
    </article>
  </main>
  <script>
    function copyText(id) {
      const node = document.getElementById(id);
      if (!node) return;
      navigator.clipboard.writeText(node.textContent || "");
    }
  </script>
</body>
</html>`;
}

function renderMetadata(metadata: ReferenceCardMetadata[]): string {
  if (metadata.length === 0) return "";
  return `<ul class="meta">${metadata
    .map(
      (item) =>
        `<li>${escapeHtml(item.title)}: ${escapeHtml(item.text ?? "")}</li>`,
    )
    .join("")}</ul>`;
}

function renderCopyActions(primary: string, source?: string): string {
  if (!primary && !source) return "";
  return `<div class="actions">
    ${primary ? `<button class="primary" onclick="copyText('primary-copy')">Copy Result</button><span id="primary-copy" hidden>${escapeHtml(primary)}</span>` : ""}
    ${source ? `<button onclick="copyText('source-copy')">Copy Source</button><span id="source-copy" hidden>${escapeHtml(source)}</span>` : ""}
  </div>`;
}

function renderSource(input: ReferenceCardInput): string {
  if (!input.sourceText) return "";
  return `<section>
    <h2>${escapeHtml(input.sourceTitle ?? "Source")}</h2>
    <blockquote class="source">${escapeHtml(input.sourceText)}</blockquote>
  </section>`;
}

function renderOutput(input: ReferenceCardInput): string {
  if (!input.outputText) return "";
  return `<section>
    <h2>${escapeHtml(input.outputTitle ?? "Result")}</h2>
    <div class="answer">${escapeHtml(input.outputText)}</div>
  </section>`;
}

function renderCoaching(input: ReferenceCardInput): string {
  if (!input.coaching) return "";
  return `<section>
    <h2>${escapeHtml(input.coachingTitle ?? "Why This Works")}</h2>
    ${markdownToHtml(input.coaching)}
  </section>`;
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let inCode = false;
  let code: string[] = [];

  const flushCode = () => {
    if (code.length === 0) return;
    html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
    code = [];
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed === "---") {
      html.push("<hr />");
      continue;
    }
    if (trimmed.startsWith("### ")) {
      html.push(`<h3>${inlineMarkdown(trimmed.slice(4))}</h3>`);
      continue;
    }
    if (trimmed.startsWith("## ")) {
      html.push(`<h2>${inlineMarkdown(trimmed.slice(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith("# ")) {
      html.push(`<h2>${inlineMarkdown(trimmed.slice(2))}</h2>`);
      continue;
    }
    if (trimmed.startsWith("> ")) {
      html.push(`<blockquote>${inlineMarkdown(trimmed.slice(2))}</blockquote>`);
      continue;
    }
    html.push(`<p>${inlineMarkdown(trimmed)}</p>`);
  }
  if (inCode) flushCode();
  return html.join("\n");
}

function inlineMarkdown(value: string): string {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
