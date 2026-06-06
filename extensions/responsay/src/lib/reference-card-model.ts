export interface ReferenceCardMetadata {
  title: string;
  text?: string;
}

export interface ReferenceCardInput {
  title: string;
  sourceTitle?: string;
  sourceText?: string;
  outputTitle?: string;
  outputText?: string;
  markdown: string;
  metadata?: ReferenceCardMetadata[];
}

export function renderReferenceCardHtml(input: ReferenceCardInput): string {
  const metadata = (input.metadata ?? []).filter((item) => item.text);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)}</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f6f5ef;
      --paper: #fffdf7;
      --ink: #1f1d19;
      --muted: #706a60;
      --line: #ddd6c8;
      --accent: #0f766e;
      --soft: #e2f3ef;
      --code: #f0ece1;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #151715;
        --paper: #20231f;
        --ink: #f4f0e8;
        --muted: #b8b0a4;
        --line: #3c3d36;
        --accent: #7dd3c7;
        --soft: #183a36;
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
      width: min(900px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 24px 0 48px;
    }
    article {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 28px;
      box-shadow: 0 18px 45px rgba(0, 0, 0, .10);
    }
    h1, h2 { line-height: 1.25; margin: 0; }
    h1 { font-size: clamp(28px, 6vw, 46px); }
    h2 { font-size: 18px; margin-top: 28px; }
    blockquote {
      margin: 12px 0 0;
      border-left: 4px solid var(--accent);
      padding: 10px 14px;
      background: var(--soft);
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
      word-break: break-word;
    }
    .ipa {
      margin-top: 14px;
      font-size: clamp(22px, 5vw, 36px);
      line-height: 1.25;
      font-weight: 750;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 18px 0 0;
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
    button {
      margin-top: 18px;
      border: 1px solid var(--accent);
      background: var(--accent);
      color: var(--paper);
      border-radius: 6px;
      padding: 7px 10px;
      font: inherit;
      font-size: 13px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <main>
    <article>
      <h1>${escapeHtml(input.title)}</h1>
      ${renderMetadata(metadata)}
      ${input.outputText ? `<button onclick="navigator.clipboard.writeText(document.getElementById('copy-output').textContent)">Copy IPA</button><span id="copy-output" hidden>${escapeHtml(input.outputText)}</span>` : ""}
      ${renderSource(input)}
      ${renderOutput(input)}
      <section>
        <h2>Analysis Note</h2>
        <pre>${escapeHtml(input.markdown)}</pre>
      </section>
    </article>
  </main>
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

function renderSource(input: ReferenceCardInput): string {
  if (!input.sourceText) return "";
  return `<section>
    <h2>${escapeHtml(input.sourceTitle ?? "Sentence")}</h2>
    <blockquote>${escapeHtml(input.sourceText)}</blockquote>
  </section>`;
}

function renderOutput(input: ReferenceCardInput): string {
  if (!input.outputText) return "";
  return `<section>
    <h2>${escapeHtml(input.outputTitle ?? "IPA")}</h2>
    <div class="ipa">${escapeHtml(input.outputText)}</div>
  </section>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
