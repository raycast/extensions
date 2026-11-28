import * as fs from "node:fs";
import { htmlToMarkdown } from "./html-markdown.js";
import { webpageFilename } from "./monolith.js";
import { PageArticle, loadPageArticle } from "./sources/page.js";
import { uniqueFilePath } from "./unique-path.js";

// The Markdown save mode for webpages: the article Reader View would show
// (Mozilla Readability), written as one `.md` file with its title, source and
// date on top. It needs no extra tool — the page is fetched by the same guarded
// reader Chat About Link uses, so it never reaches the local network.

const MAX_NAME = 120;
/** Leaves room in a 255-byte file name for a ` (99)` copy number and `.md`. */
const MAX_NAME_BYTES = 200;
/** Characters no file name may hold on Windows (which covers macOS too), and control characters. */
// eslint-disable-next-line no-control-regex
const UNSAFE = /[<>:"/\\|?*\u0000-\u001f\u007f]+/g;
/** Names Windows reserves, with or without an extension. */
const RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

/** A file name (without extension) from the page's title, or from its URL when the title leaves nothing. */
export function markdownBasename(title: string | undefined, url: string): string {
  let name = (title ?? "")
    .replace(UNSAFE, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[. ]+|[. ]+$/g, "");
  // Cut on a code point, not inside a surrogate pair: at most MAX_NAME
  // characters and MAX_NAME_BYTES of UTF-8. File names top out at 255 bytes,
  // and a CJK title is three bytes a character, before ` (2).md` is added.
  const kept: string[] = [];
  let bytes = 0;
  for (const char of name) {
    const size = Buffer.byteLength(char, "utf8");
    if (kept.length === MAX_NAME || bytes + size > MAX_NAME_BYTES) break;
    kept.push(char);
    bytes += size;
  }
  if (kept.length < [...name].length) name = kept.join("").replace(/[. ]+$/g, "");
  if (!name) name = webpageFilename(url).replace(/\.html$/, "");
  return RESERVED.test(name) ? `_${name}` : name;
}

/** A YAML double-quoted string (JSON's escaping is valid YAML). */
const yaml = (value: string) => JSON.stringify(value.replace(/\s+/g, " ").trim());

/**
 * The page as a Markdown document: YAML front matter (title, source, site,
 * author, dates — what Obsidian and static-site tools read), the title as a
 * heading, then the article. `saved` is the local calendar date.
 */
export function pageMarkdown(page: PageArticle, now = new Date()): string {
  const { ctx } = page;
  const pad = (n: number) => String(n).padStart(2, "0");
  const saved = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const front = [
    `title: ${yaml(ctx.title)}`,
    `source: ${yaml(ctx.url)}`,
    ctx.site ? `site: ${yaml(ctx.site)}` : undefined,
    ctx.author ? `author: ${yaml(ctx.author)}` : undefined,
    ctx.publishedAt ? `published: ${ctx.publishedAt}` : undefined,
    `saved: ${saved}`,
  ].filter(Boolean);
  const body = htmlToMarkdown(page.articleHtml, ctx.url);
  // Some articles repeat their headline as the first heading.
  const heading = /^# (.+)\n/.exec(body)?.[1]?.trim() === ctx.title.trim() ? "" : `# ${ctx.title.trim()}\n\n`;
  return `---\n${front.join("\n")}\n---\n\n${heading}${body}`;
}

export type MarkdownSaveResult = { filePath: string; title: string };

/**
 * Fetch `url` and save its article as Markdown in `folder`. The file is named
 * after the title, numbered when that name is taken, and created exclusively
 * so two saves started together can't write the same file. Rejects when the
 * page has no readable text (a login, a JavaScript app): there's nothing to
 * convert, and the Complete mode keeps such a page as it is.
 */
export async function savePageAsMarkdown(
  url: string,
  folder: string,
  options: { signal?: AbortSignal } = {},
): Promise<MarkdownSaveResult> {
  const page = await loadPageArticle(url, { signal: options.signal });
  if (!page.articleHtml) {
    throw new Error(
      `${page.ctx.note ?? "Couldn't read this page's text."} Markdown needs readable text — choose the Complete save mode to keep the page as it is.`,
    );
  }
  const markdown = pageMarkdown(page);
  fs.mkdirSync(folder, { recursive: true });
  const base = markdownBasename(page.ctx.title, page.ctx.url);
  // lstat, not existsSync: a broken symlink with the name would fail the exclusive create forever.
  const taken = (p: string) => fs.lstatSync(p, { throwIfNoEntry: false }) !== undefined;
  for (;;) {
    const filePath = uniqueFilePath(folder, base, "md", taken);
    try {
      fs.writeFileSync(filePath, markdown, { flag: "wx" });
      return { filePath, title: page.ctx.title };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
}
