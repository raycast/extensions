// Pure parsers for the `android docs` subcommands. Kept free of any Raycast or
// Node imports so they can be unit-tested directly against captured CLI stdout.

export interface DocsSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface DocsArticle {
  title: string;
  url: string;
  body: string;
}

const TITLE_LINE = /^\s*\d+\.\s+(.*\S)\s*$/;
const URL_LINE = /^\s*URL:\s*(\S.*?)\s*$/;

/**
 * Parse `android docs search <query>` stdout into structured results.
 *
 * Real output interleaves preamble lines ("Waiting for index to be ready...",
 * "Searching docs for: ...") with numbered result blocks of the shape:
 *
 *   1. <Title>
 *      URL: kb://android/topic/.../overview
 *      <snippet truncated with ...>
 *
 * Any line that is not part of a numbered block (preamble, blanks) is ignored.
 */
export function parseDocsSearch(stdout: string): DocsSearchResult[] {
  const lines = stdout.split("\n");
  const results: DocsSearchResult[] = [];

  for (let i = 0; i < lines.length; i++) {
    const titleMatch = lines[i].match(TITLE_LINE);
    if (!titleMatch) {
      continue;
    }
    const title = titleMatch[1].trim();

    // The URL must follow the title before the next numbered block.
    let url: string | undefined;
    let urlIndex = -1;
    for (let j = i + 1; j < lines.length && !TITLE_LINE.test(lines[j]); j++) {
      const urlMatch = lines[j].match(URL_LINE);
      if (urlMatch) {
        url = urlMatch[1].trim();
        urlIndex = j;
        break;
      }
    }
    if (!url) {
      continue;
    }

    // The snippet is the first non-empty line after the URL, before the next block.
    let snippet = "";
    for (
      let k = urlIndex + 1;
      k < lines.length && !TITLE_LINE.test(lines[k]);
      k++
    ) {
      const text = lines[k].trim();
      if (text.length > 0) {
        snippet = text;
        break;
      }
    }

    results.push({ title, url, snippet });
  }

  return results;
}

/**
 * Parse `android docs fetch <kb-url>` stdout into a renderable article.
 *
 * Real output is preamble ("Waiting for index...", "Fetching docs from: ...")
 * then a small header block, a line of dashes, then the markdown body:
 *
 *   Title: <Title>
 *   URL: kb://...
 *   ----------------------------------------
 *   <markdown body, contains developer.android.com links>
 */
export function parseDocsFetch(stdout: string): DocsArticle {
  const lines = stdout.split("\n");
  let title = "";
  let url = "";
  let separatorIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!title) {
      const m = line.match(/^Title:\s*(.*)$/);
      if (m) {
        title = m[1].trim();
        continue;
      }
    }
    if (!url) {
      const m = line.match(/^URL:\s*(.*)$/);
      if (m) {
        url = m[1].trim();
        continue;
      }
    }
    if (/^-{3,}$/.test(line.trim())) {
      separatorIndex = i;
      break;
    }
  }

  const body =
    separatorIndex >= 0
      ? lines
          .slice(separatorIndex + 1)
          .join("\n")
          .trim()
      : "";

  return { title, url, body };
}

/**
 * Map a kb:// knowledge-base URL to its public developer.android.com page.
 * Only `kb://android/...` entries have a developer.android.com equivalent;
 * other hosts (e.g. `kb://JetBrains/...` for KMP docs) return undefined so the
 * caller can fall back rather than link to a 404.
 */
export function toDeveloperUrl(kbUrl: string): string | undefined {
  const match = kbUrl.match(/^kb:\/\/android\/(.*)$/);
  if (!match) {
    return undefined;
  }
  return `https://developer.android.com/${match[1]}`;
}
