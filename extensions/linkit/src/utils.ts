import type { SearchResult } from "./types";

export function formatResultsAsMarkdown(results: SearchResult[]): string {
  return results
    .map((r) => `[${escapeMdBrackets(r.title)}](${r.url})`)
    .join("\n");
}

export function formatSingleAsMarkdownLink(r: SearchResult): string {
  return `[${escapeMdBrackets(r.title)}](${r.url})`;
}

export function formatSingleAsMarkdownCard(r: SearchResult): string {
  const hostname = new URL(r.url).hostname;
  const lines = [
    `> **[${escapeMdBrackets(r.title)}](${r.url})**`,
    r.snippet ? `> ${r.snippet}` : null,
    `> *${hostname}*`,
  ];
  return lines.filter(Boolean).join("\n");
}

export function formatResultsAsMarkdownCards(results: SearchResult[]): string {
  return results
    .map((r) => {
      const hostname = new URL(r.url).hostname;
      const lines = [
        `> **[${escapeMdBrackets(r.title)}](${r.url})**`,
        r.snippet ? `> ${r.snippet}` : null,
        `> *${hostname}*`,
      ];
      return lines.filter(Boolean).join("\n");
    })
    .join("\n\n");
}

export function formatResultsAsHtmlCards(results: SearchResult[]): {
  html: string;
  text: string;
} {
  const cards = results.map((r) => {
    const hostname = new URL(r.url).hostname;
    const escapedTitle = escapeHtml(r.title);
    const escapedSnippet = r.snippet ? escapeHtml(r.snippet) : "";
    const escapedHostname = escapeHtml(hostname);
    const escapedUrl = escapeHtml(r.url);

    const snippetRow = escapedSnippet
      ? `<tr><td style="padding:0 0 6px 0;color:#57606a;font-size:13px;line-height:1.5;">${escapedSnippet}</td></tr>`
      : "";

    return (
      `<table style="border:1px solid #d0d7de;border-radius:6px;padding:0;max-width:520px;` +
      `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;` +
      `font-size:14px;border-collapse:collapse;margin-bottom:8px;">` +
      `<tr><td style="padding:12px 16px;">` +
      `<table style="border-collapse:collapse;width:100%;">` +
      `<tr><td style="padding:0 0 4px 0;">` +
      `<a href="${escapedUrl}" style="font-weight:600;color:#0969da;text-decoration:none;font-size:14px;">${escapedTitle}</a>` +
      `</td></tr>` +
      snippetRow +
      `<tr><td style="padding:0;color:#8c959f;font-size:12px;">${escapedHostname}</td></tr>` +
      `</table>` +
      `</td></tr></table>`
    );
  });

  const html = cards.join("\n");
  const text = results.map((r) => `${r.title}\n${r.url}`).join("\n\n");

  return { html, text };
}

function escapeMdBrackets(text: string): string {
  return text.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
