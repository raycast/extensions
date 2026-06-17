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
    const rel = relativeReleased(info.releasedAt);
    if (rel) lines.push("", `_New version released ${rel}._`);
  } else {
    lines.push(`**Up to date** · \`${info.app.version}\``);
  }
  lines.push("");

  for (const line of notesBlock(info)) lines.push(line);

  return lines.join("\n");
}

const MAX_NOTES = 4000;

/**
 * The release-notes block — the thoughtful part. We prefer real, inline notes
 * in whatever form the source gives us (GitHub Markdown → Sparkle HTML → App
 * Store plain text), render each correctly, and always offer a link to the
 * full notes. When a source has none (Homebrew, a quiet App Store release), we
 * say so honestly and point somewhere useful rather than dead-ending on
 * "no notes."
 */
export function notesBlock(info: UpdateInfo): string[] {
  const out: string[] = [];
  const url = info.releaseNotesUrl ?? info.downloadUrl;
  const heading = info.hasUpdate
    ? `## What's new in ${info.latestVersion}`
    : `## Release notes`;

  let body: string | null = null;
  if (info.releaseNotesMarkdown) {
    body = info.releaseNotesMarkdown; // already Markdown (GitHub release body)
  } else if (info.releaseNotesHtml) {
    body = htmlToMarkdown(info.releaseNotesHtml); // Sparkle appcast
  } else if (info.releaseNotesText) {
    // Plain text (App Store): single newlines don't break in Markdown, so make
    // each line a hard break to preserve the author's structure.
    body = info.releaseNotesText
      .replace(/\r\n?/g, "\n")
      .trim()
      .split("\n")
      .map((l) => l.trimEnd())
      .join("  \n");
  }

  if (body && body.trim()) {
    const truncated = body.length > MAX_NOTES;
    out.push(heading, "");
    out.push(truncated ? body.slice(0, MAX_NOTES).trimEnd() + "…" : body, "");
    if (info.releaseNotesUrl) {
      out.push(`[Read the full release notes →](${info.releaseNotesUrl})`);
    }
    return out;
  }

  // No inline notes — a graceful, source-aware pointer.
  switch (info.source) {
    case "mas":
      out.push(
        url
          ? `The App Store didn't publish a changelog for this version. [View on the App Store →](${url})`
          : `The App Store didn't publish a changelog for this version.`,
      );
      break;
    case "homebrew-cask":
    case "homebrew-formula":
      out.push(
        url
          ? `Homebrew doesn't carry release notes — [visit the project page →](${url}) for what changed.`
          : `Homebrew doesn't carry release notes for this app.`,
      );
      break;
    default:
      out.push(
        url
          ? `[Read the release notes →](${url})`
          : `No release notes available for this version.`,
      );
  }
  return out;
}

/** "today" / "yesterday" / "5 days ago" / "3 months ago" — null if unknown/future. */
function relativeReleased(epochMs?: number): string | null {
  if (!epochMs) return null;
  const diff = Date.now() - epochMs;
  if (diff < 0) return null;
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
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
