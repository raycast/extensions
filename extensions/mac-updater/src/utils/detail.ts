import * as fs from "fs";
import { UpdateInfo } from "./types";

/**
 * Convert Sparkle/AppCast release-notes HTML into clean Markdown.
 * Handles the common tags Sparkle authors use:
 *   <p>, <br>, <ul>/<ol>/<li>, <strong>/<b>, <em>/<i>, <code>, <a href="">,
 *   <h1>–<h6>, <hr>, and stray entities like &amp; &lt; &gt;.
 *
 * Anything else gets stripped — the goal is readable prose, not a faithful
 * HTML reproduction.
 */
export function htmlToMarkdown(html: string): string {
  let s = html;

  // Normalize line endings
  s = s.replace(/\r\n?/g, "\n");

  // Headers
  for (let level = 6; level >= 1; level--) {
    const tag = `h${level}`;
    const hashes = "#".repeat(level);
    s = s.replace(
      new RegExp(`<${tag}[^>]*>\\s*([\\s\\S]*?)\\s*</${tag}>`, "gi"),
      `\n\n${hashes} $1\n\n`,
    );
  }

  // Horizontal rule
  s = s.replace(/<hr[^>]*\/?>/gi, "\n\n---\n\n");

  // Links: <a href="x">text</a>
  s = s.replace(
    /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    "[$2]($1)",
  );

  // Bold / strong
  s = s.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/(strong|b)>/gi, "**$2**");
  // Emphasis / italic
  s = s.replace(/<(em|i)[^>]*>([\s\S]*?)<\/(em|i)>/gi, "_$2_");
  // Inline code
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");
  // Block code
  s = s.replace(/<pre[^>]*>\s*([\s\S]*?)\s*<\/pre>/gi, "\n\n```\n$1\n```\n\n");

  // Lists — handle nested <li> as "- " bullets. We don't preserve nesting depth.
  s = s.replace(/<li[^>]*>\s*([\s\S]*?)\s*<\/li>/gi, "- $1\n");
  s = s.replace(/<\/?(ul|ol)[^>]*>/gi, "\n");

  // Paragraphs + line breaks
  s = s.replace(/<\/?p[^>]*>/gi, "\n\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");

  // Strip any remaining tags
  s = s.replace(/<[^>]+>/g, "");

  // Decode the common entities Sparkle feeds emit
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");

  // Collapse runs of blank lines to a single blank line
  s = s.replace(/\n{3,}/g, "\n\n").trim();

  return s;
}

/**
 * Compose the full detail-panel markdown for an app update. Apple-style: a
 * leading icon, a clear title, the version transition, then release notes.
 */
export function buildAppDetailMarkdown(info: UpdateInfo): string {
  const lines: string[] = [];

  // App icon at the top (via local file URL) — gives the detail pane an Apple-y header
  if (info.app.iconPath && fs.existsSync(info.app.iconPath)) {
    // Raycast detail panels accept Markdown image tags; constrain width via attribute trick
    const fileUrl = "file://" + encodeURI(info.app.iconPath);
    lines.push(`<img src="${fileUrl}" width="80" />`);
    lines.push("");
  }

  lines.push(`# ${info.app.name}`);
  lines.push("");

  if (info.hasUpdate) {
    lines.push(
      `**Update available** · \`${info.app.version}\` → \`${info.latestVersion}\``,
    );
  } else {
    lines.push(`**Up to date** · \`${info.app.version}\``);
  }
  lines.push("");

  if (info.releaseNotesHtml) {
    lines.push(`## What's new in ${info.latestVersion}`);
    lines.push("");
    lines.push(htmlToMarkdown(info.releaseNotesHtml).slice(0, 4000));
  } else if (info.releaseNotesUrl) {
    lines.push(`## Release notes`);
    lines.push("");
    lines.push(
      `Read the full notes at [${shortHost(info.releaseNotesUrl)}](${info.releaseNotesUrl}).`,
    );
  } else {
    lines.push(`_No release notes provided by the source._`);
  }

  return lines.join("\n");
}

function shortHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Format a file size into a human readable string. */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Recursively sum file sizes for an .app bundle (rough but fast). */
export function appBundleSize(appPath: string): number {
  let total = 0;
  const stack: string[] = [appPath];
  while (stack.length) {
    const p = stack.pop()!;
    try {
      const stat = fs.lstatSync(p);
      if (stat.isSymbolicLink()) continue;
      if (stat.isDirectory()) {
        for (const entry of fs.readdirSync(p)) stack.push(`${p}/${entry}`);
      } else {
        total += stat.size;
      }
    } catch {
      // unreadable — skip
    }
  }
  return total;
}

/** Pretty format a date like "Jan 12, 2026 at 4:21 PM". */
export function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
