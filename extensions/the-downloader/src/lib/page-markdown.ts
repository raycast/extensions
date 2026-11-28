import * as fs from "node:fs";
import * as path from "node:path";
import { htmlToMarkdown } from "./html-markdown.js";
import { LinkLoadError } from "./link-context.js";
import { imageExtension } from "./link-images.js";
import { safeFetch } from "./safe-fetch.js";
import { webpageFilename } from "./monolith.js";
import { AbortError } from "./run.js";
import { loadArchivedArticle } from "./sources/archive.js";
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
 * heading, then the article. `saved` is the local calendar date. A page read
 * from the Internet Archive says so: `archived` is the day that copy was made.
 * `image`, when given, decides what each image's address is written as.
 */
export function pageMarkdown(page: PageArticle, now = new Date(), image?: (url: string) => string): string {
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
    ctx.archive ? `archived: ${ctx.archive.savedOn}` : undefined,
    ctx.archive ? `archive: ${yaml(ctx.archive.viewUrl)}` : undefined,
  ].filter(Boolean);
  const body = htmlToMarkdown(page.articleHtml, ctx.url, { image });
  // Some articles repeat their headline as the first heading.
  const heading = /^# (.+)\n/.exec(body)?.[1]?.trim() === ctx.title.trim() ? "" : `# ${ctx.title.trim()}\n\n`;
  return `---\n${front.join("\n")}\n---\n\n${heading}${body}`;
}

/** A page as Markdown. `archive` is set when it was read from the Internet Archive's copy. */
export type PageMarkdown = {
  markdown: string;
  title: string;
  /** The page's own address, also for an archived copy. */
  url: string;
  archive?: { viewUrl: string; savedOn: string };
};

/** What a toast adds for a page that came from the Internet Archive; empty for a live page. */
export function archiveNote(archive: PageMarkdown["archive"]): string {
  return archive ? `From the Internet Archive's copy saved ${archive.savedOn}.` : "";
}

/** The page's live error without its advice to try the archive, for when the archive was tried too. */
function withoutArchiveAdvice(message: string): string {
  const end = message.indexOf(").");
  return end === -1 ? message : message.slice(0, end + 2);
}

/**
 * The live page's article, or — when the site turned the reader away (HTTP 403
 * or 429) or the page is gone (404, 410) — the Internet Archive's latest copy
 * of it. A login, a paywall or a legal block never falls back: page.ts offers
 * no archive for those, as that is the site's own decision.
 */
async function loadArticle(url: string, signal?: AbortSignal): Promise<PageArticle> {
  try {
    return await loadPageArticle(url, { signal });
  } catch (error) {
    if (!(error instanceof LinkLoadError) || error.fix !== "archive") throw error;
    try {
      return await loadArchivedArticle(url, { signal });
    } catch (archiveError) {
      if (signal?.aborted) throw archiveError;
      const why = archiveError instanceof Error ? archiveError.message : String(archiveError);
      throw new Error(`${withoutArchiveAdvice(error.message)} ${why}`);
    }
  }
}

/**
 * The article of `url`, live or archived (see `loadArticle`). Rejects when the
 * page has no readable text (a login, a JavaScript app): there's nothing to
 * convert, and the Complete mode keeps such a page as it is.
 */
async function loadReadableArticle(url: string, signal?: AbortSignal): Promise<PageArticle> {
  let page: PageArticle;
  try {
    page = await loadArticle(url, signal);
  } catch (error) {
    // Stop is a cancel, not a failure: the reader's own "request was stopped" would show as one.
    if (signal?.aborted) throw new AbortError();
    throw error;
  }
  if (!page.articleHtml) {
    throw new Error(
      `${page.ctx.note ?? "Couldn't read this page's text."} Markdown needs readable text — choose the Complete save mode to keep the page as it is.`,
    );
  }
  return page;
}

/** Fetch `url` and write its article as Markdown (see `loadReadableArticle`). Images stay links to the web. */
export async function loadPageMarkdown(url: string, options: { signal?: AbortSignal } = {}): Promise<PageMarkdown> {
  const page = await loadReadableArticle(url, options.signal);
  return { markdown: pageMarkdown(page), title: page.ctx.title, url: page.ctx.url, archive: page.ctx.archive };
}

/** The folder, beside a note, that holds the images of the notes saved there: `assets/<note name>/`. */
export const ASSETS_FOLDER = "assets";
/** Most images saved for one page; the rest stay links to the web. */
export const MAX_PAGE_IMAGES = 80;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
/** Stop fetching more once a page's images add up to this. */
const MAX_PAGE_IMAGE_BYTES = 200 * 1024 * 1024;
const IMAGE_FETCHES = 4;

/**
 * A Markdown link to a file beside the note: relative, each part
 * percent-encoded, so spaces and brackets in a title can't end the link.
 */
export function assetLink(parts: string[]): string {
  return parts.map((part) => encodeURIComponent(part).replace(/\(/g, "%28").replace(/\)/g, "%29")).join("/");
}

/**
 * Download `urls` into `dir`, a few at a time, through the guarded reader (so
 * never from the local network). Returns each saved image's file name by its
 * address. One that fails, is too big or isn't an image the way its bytes say
 * (an SVG, an error page) is left out, and stays a link to the web.
 */
export async function saveImages(
  urls: string[],
  dir: string,
  /** `written` collects the files as they are saved, so a caller can take back exactly those. */
  options: { signal?: AbortSignal; written?: string[] } = {},
): Promise<Map<string, string>> {
  const list = urls.slice(0, MAX_PAGE_IMAGES);
  const saved = new Map<string, string>();
  let bytes = 0;
  let next = 0;
  const worker = async () => {
    while (next < list.length && bytes < MAX_PAGE_IMAGE_BYTES && !options.signal?.aborted) {
      const index = next++;
      try {
        const response = await safeFetch(list[index], {
          signal: options.signal,
          accept: ["image/"],
          maxBytes: MAX_IMAGE_BYTES,
        });
        const extension = imageExtension(response.body);
        if (!extension) continue;
        bytes += response.body.length;
        // Numbered by the image's place on the page, whichever download ends first.
        const name = `image-${String(index + 1).padStart(2, "0")}.${extension}`;
        fs.mkdirSync(dir, { recursive: true });
        // Exclusive: never over a file that is already there.
        fs.writeFileSync(path.join(dir, name), response.body, { flag: "wx" });
        options.written?.push(path.join(dir, name));
        saved.set(list[index], name);
      } catch {
        /* this image stays a link to the web */
      }
    }
  };
  await Promise.all(Array.from({ length: IMAGE_FETCHES }, worker));
  if (options.signal?.aborted) throw new AbortError();
  return saved;
}

export type MarkdownSaveResult = {
  filePath: string;
  title: string;
  archive?: PageMarkdown["archive"];
  /** With `localImages`: how many of the page's images were saved beside the note. */
  images?: { saved: number; total: number };
};

/** What a toast adds about the saved images: `12 images saved`, `9 of 12 images saved`; empty when none were asked for. */
export function imagesNote(images: MarkdownSaveResult["images"]): string {
  if (!images || images.total === 0) return "";
  const noun = `image${images.total === 1 ? "" : "s"}`;
  return images.saved === images.total
    ? `${images.total} ${noun} saved`
    : `${images.saved} of ${images.total} ${noun} saved`;
}

/**
 * Fetch `url` and save its article as Markdown in `folder` (see
 * `loadPageMarkdown`). The file is named after the title, numbered when that
 * name is taken, and created exclusively so two saves started together can't
 * write the same file.
 *
 * With `localImages`, the page's images are saved into a new
 * `assets/<file name>/` folder beside it and the Markdown points at those
 * copies, so the note reads the same offline and after the site changes. Stop
 * removes the note and the images fetched for it, and nothing else.
 */
export async function savePageAsMarkdown(
  url: string,
  folder: string,
  options: { signal?: AbortSignal; localImages?: boolean } = {},
): Promise<MarkdownSaveResult> {
  const page = await loadReadableArticle(url, options.signal);
  const now = new Date();
  const urls: string[] = [];
  const markdown = pageMarkdown(page, now, (address) => {
    if (!urls.includes(address)) urls.push(address);
    return address;
  });
  fs.mkdirSync(folder, { recursive: true });
  const base = markdownBasename(page.ctx.title, page.ctx.url);
  // lstat, not existsSync: a broken symlink with the name would fail the exclusive create forever.
  const taken = (p: string) => fs.lstatSync(p, { throwIfNoEntry: false }) !== undefined;
  let filePath: string;
  for (;;) {
    filePath = uniqueFilePath(folder, base, "md", taken);
    try {
      fs.writeFileSync(filePath, markdown, { flag: "wx" });
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  const result: MarkdownSaveResult = { filePath, title: page.ctx.title, archive: page.ctx.archive };
  if (!options.localImages || urls.length === 0) return result;

  // What this save created, to take back exactly that (and nothing an earlier note owns) if it's stopped.
  const written: string[] = [];
  let dir: string | undefined;
  const removeIfEmpty = (folderPath: string) => {
    try {
      fs.rmdirSync(folderPath);
    } catch {
      /* something is in it, or it's already gone */
    }
  };
  try {
    const assets = reserveAssetsDir(folder, path.basename(filePath, ".md"));
    dir = assets.dir;
    const saved = await saveImages(urls, dir, { signal: options.signal, written });
    if (saved.size > 0) {
      const local = (address: string) => {
        const file = saved.get(address);
        return file ? assetLink([ASSETS_FOLDER, assets.name, file]) : address;
      };
      fs.writeFileSync(filePath, pageMarkdown(page, now, local));
    } else {
      // Nothing to keep: no empty folders left behind.
      removeIfEmpty(dir);
      removeIfEmpty(path.join(folder, ASSETS_FOLDER));
    }
    return { ...result, images: { saved: saved.size, total: urls.length } };
  } catch (error) {
    // Stopped (or the disk gave out): no note left pointing at images that aren't there.
    fs.rmSync(filePath, { force: true });
    for (const file of written) fs.rmSync(file, { force: true });
    if (dir) removeIfEmpty(dir);
    removeIfEmpty(path.join(folder, ASSETS_FOLDER));
    throw error;
  }
}

/**
 * A new, empty folder for a note's images: `assets/<name>`, or `<name> (2)`,
 * `(3)`… when that one exists. A note that was renamed or deleted leaves its
 * image folder behind, and another note may still point into it, so an
 * existing folder is never reused. Created exclusively, like the note itself.
 */
function reserveAssetsDir(folder: string, name: string): { dir: string; name: string } {
  fs.mkdirSync(path.join(folder, ASSETS_FOLDER), { recursive: true });
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? name : `${name} (${n})`;
    const dir = path.join(folder, ASSETS_FOLDER, candidate);
    try {
      fs.mkdirSync(dir);
      return { dir, name: candidate };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
}

/**
 * The link that opens `filePath` in Obsidian, when it lies inside a vault (a
 * folder with `.obsidian` in it, here or above); otherwise undefined.
 */
export function obsidianUrl(filePath: string): string | undefined {
  let dir = path.dirname(filePath);
  for (let depth = 0; depth < 20; depth++) {
    if (fs.existsSync(path.join(dir, ".obsidian"))) return `obsidian://open?path=${encodeURIComponent(filePath)}`;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}
