import { docsUrl, markdownUrl } from "@/utils/constants";
import { resolveRelativePath } from "@/utils/url";

export async function getLinkMarkdown(url: string) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url} (${res.status} ${res.statusText})`);
  }

  let resText = await res.text();

  resText = replaceRelativeImageLinks(resText, url);
  resText = replaceRelativeMarkdownLinks(resText, url);
  resText = replaceDetailsSummary(resText);
  resText = replaceLinks(resText);
  resText = replaceMarkedText(resText);
  resText = replaceHints(resText);
  resText = replaceTabs(resText);
  resText = replaceCodeTags(resText);
  resText = frontmatterToLead(resText);
  resText = replaceTableFromJSDocComponent(resText, toDocsUrl(url));
  return resText;
}

/** Maps a raw GitHub markdown URL back to its published documentation page. */
function toDocsUrl(url: string): string {
  return url
    .replace(markdownUrl, docsUrl)
    .replace(/\/README\.md$/, "")
    .replace(/\.md$/, "");
}

const CODE_FENCE = /^\s*```/;

/**
 * Walks `content` line by line, applying `transform` only to lines outside a fenced code
 * block. Fence-delimiter lines and everything between them pass through unchanged. Shares
 * the fence-tracking shape used by `replaceTableFromJSDocComponent`.
 */
function mapLinesOutsideCodeFences(content: string, transform: (line: string) => string): string {
  let inCodeFence = false;
  return content
    .split("\n")
    .map((line) => {
      if (CODE_FENCE.test(line)) {
        inCodeFence = !inCodeFence;
        return line;
      }
      if (inCodeFence) return line;
      return transform(line);
    })
    .join("\n");
}

/** Applies `transform` only to the parts of a (non-fenced) line outside inline `code spans`. */
function mapSegmentsOutsideInlineCode(line: string, transform: (segment: string) => string): string {
  return line
    .split(/(`[^`]*`)/)
    .map((segment) => (segment.startsWith("`") ? segment : transform(segment)))
    .join("");
}

function replaceRelativeImageLinks(content: string, currentDocUrl: string): string {
  return mapLinesOutsideCodeFences(content, (line) =>
    mapSegmentsOutsideInlineCode(line, (segment) =>
      segment.replace(/!\[(.*?)\]\(((\.\.\/)*)([^)]+)\)/g, (match, altText, dots, _, path) => {
        if (path.startsWith("http")) return match;
        const fullPath = dots ? dots + path : path;
        return `![${altText}](${resolveRelativePath(fullPath, currentDocUrl)})`;
      }),
    ),
  );
}

function replaceRelativeMarkdownLinks(content: string, currentDocUrl: string): string {
  return content.replace(/(!)?\[(.*?)\]\(((\.\.\/)*)([^)]+)\)/g, (match, bang, altText, dots, _, path) => {
    // Skip image markdown links (captured leading `!`) — real now: the regex captures the
    // bang instead of relying on `match` (which always starts at `[`, never `!`).
    if (bang) {
      return match;
    }

    if (path.startsWith("http")) return match;

    const fullPath = dots ? dots + path : path;
    let resolvedUrl = resolveRelativePath(fullPath, currentDocUrl);
    resolvedUrl = resolvedUrl.replace(markdownUrl, docsUrl).replace(".md", "");

    return `[${altText}](${resolvedUrl})`;
  });
}

function replaceDetailsSummary(content: string): string {
  return content.replaceAll(/<details>\s*<summary>(.*?)<\/summary>/g, "\n---\n**$1**\n").replaceAll(/<\/details>/g, "");
}

function replaceLinks(content: string): string {
  // Matches `href` in any attribute position (`<a title="…" href="…">`, `<a href="…" target="_blank">`, …).
  // An anchor whose body is an `<img>` (e.g. a "Store install" badge) is left as-is inside the
  // brackets — `[<img .../>](url)` — rather than converting it to a nested `![alt](src)` markdown
  // image, since nothing in this pipeline depends on that badge rendering as an image.
  return content.replaceAll(/<a\s[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, "[$2]($1)");
}

function replaceMarkedText(content: string): string {
  return content.replaceAll(/<mark style="color:red;">(.*?)<\/mark>/g, "$1");
}

function replaceHints(content: string): string {
  return content.replaceAll(/\{% hint .* %\}\s+/g, "> ").replaceAll("{% endhint %}", "");
}

function replaceCodeTags(content: string): string {
  return content.replaceAll(/<\/?code>/g, "`");
}

function replaceTabs(content: string): string {
  return content
    .replaceAll(/\{% tabs %\}\s+/g, "")
    .replaceAll(/\{% endtabs %\}\s+/g, "")
    .replaceAll(/{% tab title="([^"]+)" %}/g, "$1")
    .replaceAll(/\{% endtab %\}\s+/g, "");
}

/**
 * GitBook pages carry a single `description` key in their frontmatter, sometimes as a
 * folded block scalar. Render it as a lead-in quote and drop the rest.
 */
function frontmatterToLead(text: string): string {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return text;

  const body = text.slice(match[0].length).replace(/^\s+/, "");
  const lines = match[1].split(/\r?\n/);
  const start = lines.findIndex((line) => /^description:/.test(line));
  if (start === -1) return body;

  const first = lines[start].slice("description:".length).trim();
  let description = first;

  // Block scalar (`>`, `>-`, `|`, `|-`): the value lives on the indented lines below.
  if (/^[>|][-+]?$/.test(first)) {
    const continuation: string[] = [];
    for (const line of lines.slice(start + 1)) {
      if (!/^\s/.test(line)) break;
      continuation.push(line.trim());
    }
    description = continuation.join(first.startsWith("|") ? "\n" : " ");
  }

  description = description.replace(/^["']|["']$/g, "").trim();
  if (!description) return body;

  return `> ${description.replace(/\n/g, "\n> ")}\n\n${body}`;
}

/**
 * GitBook anchors a heading as its slugified text, appending `-1`, `-2`… for repeats.
 * The page title (h1) is not anchored, so it takes no slug.
 */
function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ._-]/g, "")
    .replace(/ /g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Props/interface tables are generated from the API's JSDoc at build time and have no
 * markdown representation. Link out to the heading that precedes each one rather than
 * dropping the reader at the top of the page.
 */
function replaceTableFromJSDocComponent(content: string, pageUrl: string): string {
  const counts = new Map<string, number>();
  let anchor: string | undefined;

  return mapLinesOutsideCodeFences(content, (line) => {
    const heading = line.match(/^#{2,6}\s+(.*)$/);
    if (heading) {
      const slug = slugifyHeading(heading[1].trim());
      const seen = counts.get(slug) ?? 0;
      counts.set(slug, seen + 1);
      anchor = seen ? `${slug}-${seen}` : slug;
      return line;
    }

    return line.replaceAll(/<\w*TableFromJSDoc\s+(?:component|name)="([^"]+)"\s*\/>/g, (_, name) => {
      return `*[\`${name}\` reference table \u2197](${anchor ? `${pageUrl}#${anchor}` : pageUrl})*`;
    });
  });
}
