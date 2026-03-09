import { getApplications } from "@raycast/api";
import { access, mkdir, readFile } from "node:fs/promises";
import { execFile as execFileCallback } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import hljs from "highlight.js";
import MarkdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import markdownItTaskLists from "markdown-it-task-lists";
import puppeteer, { type Browser } from "puppeteer-core";

const execFile = promisify(execFileCallback);

const markdown: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight(code, language): string {
    if (language && hljs.getLanguage(language)) {
      return `<pre class="hljs"><code>${hljs.highlight(code, { language, ignoreIllegals: true }).value}</code></pre>`;
    }

    return `<pre class="hljs"><code>${escapeHtml(code)}</code></pre>`;
  },
})
  .use(markdownItAnchor, {
    permalink: markdownItAnchor.permalink.headerLink(),
  })
  .use(markdownItTaskLists, {
    enabled: true,
    label: true,
    labelAfter: true,
  });

type PageSize = "letter" | "a4";

export type ConvertMarkdownOptions = {
  markdownPath: string;
  outputDirectory?: string;
  outputFileName?: string;
  pageSize: PageSize;
  preferredBrowserPath?: string;
};

export type ConvertMarkdownResult = {
  outputPath: string;
  browserName: string;
};

export type ConvertMarkdownBatchOptions = {
  markdownPaths: string[];
  pageSize: PageSize;
  preferredBrowserPath?: string;
  concurrency?: number;
  onProgress?: (progress: { completed: number; total: number; currentFile: string }) => void;
};

type BrowserCandidate = {
  name: string;
  appPath: string;
};

const supportedBrowserIds = [
  "com.google.Chrome",
  "company.thebrowser.Browser",
  "com.brave.Browser",
  "com.microsoft.edgemac",
  "org.chromium.Chromium",
];

export async function convertMarkdownToPdf(options: ConvertMarkdownOptions): Promise<ConvertMarkdownResult> {
  const renderer = await createMarkdownPdfRenderer(options.preferredBrowserPath);

  try {
    return await renderer.convert(options);
  } finally {
    await renderer.close();
  }
}

export async function convertMarkdownBatchToPdf(options: ConvertMarkdownBatchOptions): Promise<ConvertMarkdownResult[]> {
  const markdownPaths = options.markdownPaths.map((markdownPath) => path.resolve(markdownPath));

  if (markdownPaths.length === 0) {
    return [];
  }

  const renderer = await createMarkdownPdfRenderer(options.preferredBrowserPath);
  const results: ConvertMarkdownResult[] = new Array(markdownPaths.length);
  const failures: Array<{ file: string; message: string }> = [];
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 3, markdownPaths.length));
  let nextIndex = 0;
  let completed = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= markdownPaths.length) {
        return;
      }

      const markdownPath = markdownPaths[index];

      try {
        const result = await renderer.convert({
          markdownPath,
          pageSize: options.pageSize,
        });
        results[index] = result;
        completed += 1;
        options.onProgress?.({
          completed,
          total: markdownPaths.length,
          currentFile: markdownPath,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        failures.push({
          file: markdownPath,
          message,
        });
      }
    }
  }

  try {
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
  } finally {
    await renderer.close();
  }

  if (failures.length > 0) {
    const firstFailure = failures[0];
    throw new Error(`Failed ${failures.length} file(s). First error: ${path.basename(firstFailure.file)}: ${firstFailure.message}`);
  }

  return results;
}

function sanitizeOutputBaseName(value: string): string {
  return value.trim().replace(/\.pdf$/i, "").replace(/[/:]+/g, "-") || "document";
}

function extractTitle(markdownSource: string): string | undefined {
  const match = markdownSource.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim();
}

async function resolveBrowser(preferredBrowserPath?: string): Promise<BrowserCandidate> {
  if (preferredBrowserPath) {
    await access(preferredBrowserPath);
    return {
      name: path.basename(preferredBrowserPath, ".app"),
      appPath: preferredBrowserPath,
    };
  }

  const installedApps = await getApplications();

  for (const bundleId of supportedBrowserIds) {
    const app = installedApps.find((candidate) => candidate.bundleId === bundleId);
    if (app) {
      return {
        name: app.name,
        appPath: app.path,
      };
    }
  }

  throw new Error("No supported Chromium-based browser was found. Install Chrome, Arc, Brave, Edge, or Chromium, or set the extension browser preference.");
}

async function createMarkdownPdfRenderer(preferredBrowserPath?: string): Promise<{
  browserName: string;
  convert: (options: ConvertMarkdownOptions) => Promise<ConvertMarkdownResult>;
  close: () => Promise<void>;
}> {
  const browserCandidate = await resolveBrowser(preferredBrowserPath);
  const browserExecutable = await resolveAppExecutable(browserCandidate.appPath);
  const browser = await launchBrowser(browserExecutable);

  return {
    browserName: browserCandidate.name,
    async convert(options: ConvertMarkdownOptions): Promise<ConvertMarkdownResult> {
      const markdownPath = path.resolve(options.markdownPath);
      const markdownSource = await readFile(markdownPath, "utf8");
      const outputDirectory = path.resolve(options.outputDirectory ?? path.dirname(markdownPath));
      const fileNameBase = sanitizeOutputBaseName(options.outputFileName || path.basename(markdownPath, path.extname(markdownPath)));
      const outputPath = path.join(outputDirectory, `${fileNameBase}.pdf`);
      const title = extractTitle(markdownSource) || fileNameBase;
      await mkdir(outputDirectory, { recursive: true });

      const html = renderDocument({
        title,
        markdownSource,
        pageSize: options.pageSize,
      });

      await printHtmlToPdf({
        browser,
        html,
        outputPath,
        pageSize: options.pageSize,
      });

      return {
        outputPath,
        browserName: browserCandidate.name,
      };
    },
    async close() {
      await browser.close().catch(() => undefined);
    },
  };
}

async function resolveAppExecutable(appPath: string): Promise<string> {
  const infoPlistPath = path.join(appPath, "Contents", "Info");

  try {
    const { stdout } = await execFile("/usr/bin/defaults", ["read", infoPlistPath, "CFBundleExecutable"]);
    const executableName = stdout.trim();
    if (!executableName) {
      throw new Error("Missing CFBundleExecutable");
    }

    return path.join(appPath, "Contents", "MacOS", executableName);
  } catch {
    return path.join(appPath, "Contents", "MacOS", path.basename(appPath, ".app"));
  }
}

async function launchBrowser(browserExecutable: string): Promise<Browser> {
  try {
    return await puppeteer.launch({
      executablePath: browserExecutable,
      headless: true,
      args: ["--disable-gpu", "--no-first-run", "--no-default-browser-check"],
    });
  } catch (error) {
    throw new Error(`Browser launch failed: ${formatExecError(error)}`);
  }
}

async function printHtmlToPdf(options: {
  browser: Browser;
  html: string;
  outputPath: string;
  pageSize: PageSize;
}): Promise<void> {
  let page: Awaited<ReturnType<Browser["newPage"]>> | undefined;
  try {
    page = await options.browser.newPage();
    await page.emulateMediaType("screen");
    await page.setContent(options.html, { waitUntil: "networkidle0" });
    await page.pdf({
      path: options.outputPath,
      format: options.pageSize === "a4" ? "A4" : "Letter",
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    });
  } catch (error) {
    throw new Error(`Browser PDF export failed: ${formatExecError(error)}`);
  } finally {
    await page?.close().catch(() => undefined);
  }
}

function formatExecError(error: unknown): string {
  if (error && typeof error === "object") {
    const maybeError = error as { stderr?: string; stdout?: string; message?: string };
    const detail = maybeError.stderr?.trim() || maybeError.stdout?.trim() || maybeError.message;

    if (detail) {
      return detail;
    }
  }

  return "Unknown browser error";
}

function renderDocument(options: { title: string; markdownSource: string; pageSize: PageSize }): string {
  const content = markdown.render(options.markdownSource);
  const pageCss = options.pageSize === "a4" ? "size: A4;" : "size: Letter;";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(options.title)}</title>
  <style>
    @page {
      ${pageCss}
      margin: 0.72in;
    }

    :root {
      color-scheme: light;
      --bg: #ffffff;
      --fg: #111827;
      --muted: #4b5563;
      --line: #d1d5db;
      --accent: #2563eb;
      --accent-soft: #dbeafe;
      --code-bg: #111827;
      --code-fg: #f9fafb;
      --quote: #eff6ff;
      --table-head: #f3f4f6;
      --shadow: rgba(17, 24, 39, 0.08);
    }

    * {
      box-sizing: border-box;
    }

    html {
      background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
    }

    body {
      margin: 0;
      font-family: "Georgia", "Iowan Old Style", "Palatino Linotype", serif;
      color: var(--fg);
      background: var(--bg);
      font-size: 12pt;
      line-height: 1.65;
    }

    main {
      width: 100%;
    }

    h1, h2, h3, h4, h5, h6 {
      font-family: "Avenir Next", "Helvetica Neue", sans-serif;
      line-height: 1.2;
      color: #0f172a;
      margin: 1.35em 0 0.55em;
      break-after: avoid-page;
    }

    h1 {
      font-size: 28pt;
      margin-top: 0;
      padding-bottom: 0.32em;
      border-bottom: 2px solid #cbd5e1;
    }

    h2 {
      font-size: 20pt;
      padding-bottom: 0.2em;
      border-bottom: 1px solid #e5e7eb;
    }

    h3 {
      font-size: 15pt;
    }

    p, ul, ol, blockquote, pre, table {
      margin: 0 0 1.05em;
    }

    p, li, td, th {
      orphans: 3;
      widows: 3;
    }

    a {
      color: var(--accent);
      text-decoration: none;
    }

    code {
      font-family: "SF Mono", "Menlo", "Monaco", monospace;
      font-size: 0.92em;
    }

    :not(pre) > code {
      padding: 0.15em 0.38em;
      border-radius: 0.35em;
      background: #eff6ff;
      color: #1d4ed8;
    }

    pre {
      padding: 1em 1.1em;
      border-radius: 14px;
      overflow-x: auto;
      background: var(--code-bg);
      color: var(--code-fg);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 10px 24px var(--shadow);
      white-space: pre-wrap;
      word-break: break-word;
    }

    pre code {
      color: inherit;
      background: transparent;
      padding: 0;
    }

    blockquote {
      margin-left: 0;
      padding: 0.9em 1em;
      border-left: 4px solid var(--accent);
      background: var(--quote);
      color: #1e3a8a;
      border-radius: 0 12px 12px 0;
    }

    ul, ol {
      padding-left: 1.4em;
    }

    li + li {
      margin-top: 0.3em;
    }

    input[type="checkbox"] {
      transform: scale(1.1);
      margin-right: 0.45em;
    }

    hr {
      border: 0;
      border-top: 1px solid var(--line);
      margin: 1.7em 0;
    }

    img {
      max-width: 100%;
      border-radius: 14px;
      box-shadow: 0 10px 30px var(--shadow);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5pt;
      break-inside: avoid;
    }

    thead {
      background: var(--table-head);
    }

    th, td {
      text-align: left;
      padding: 0.7em 0.8em;
      border: 1px solid var(--line);
      vertical-align: top;
    }

    th {
      font-family: "Avenir Next", "Helvetica Neue", sans-serif;
    }

    .header-anchor {
      color: inherit;
    }

    .hljs-keyword,
    .hljs-selector-tag,
    .hljs-literal {
      color: #c084fc;
    }

    .hljs-string,
    .hljs-attribute,
    .hljs-title,
    .hljs-section {
      color: #86efac;
    }

    .hljs-number,
    .hljs-symbol,
    .hljs-bullet {
      color: #fca5a5;
    }

    .hljs-comment,
    .hljs-quote {
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <main>${content}</main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
