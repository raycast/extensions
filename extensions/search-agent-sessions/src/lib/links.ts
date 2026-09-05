import { readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { pixelWidth } from "./image";
import { mapProse } from "./markdown";
import { IS_WINDOWS, expandTilde, normalizeSeparators } from "./paths";

/**
 * Files a transcript names, and what the pane can do with them.
 *
 * Almost nothing, is the answer for links: a markdown link in
 * `List.Item.Detail` is only actionable for `http(s)`. A `file://` URL or a
 * `raycast://` deeplink renders, styles as a link, and does nothing whatever
 * when clicked, with no error to say why. So paths are not linked here — a link
 * that cannot be followed is worse than the plain text it replaced. Opening a
 * file is an ActionPanel's job.
 *
 * What does work is an image embed, which the renderer resolves rather than
 * navigates. That is the one rewrite this module still performs.
 */

/** Extensions Raycast's markdown renders as an image. */
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);

/**
 * The characters one path segment may hold.
 *
 * Unicode letters and digits rather than `\w`, which is ASCII. A path with a
 * non-ASCII filename matched only up to the last ASCII separator, and when that
 * prefix existed the match named the parent directory while the text still named
 * the file. Wrong target is worse than none.
 *
 * No spaces, brackets or parentheses, so a quoted path with a space in it is
 * missed. That is the right way round: the alternative is guessing where an
 * unquoted one ends, and a wrong guess names the rest of the sentence.
 *
 * The colon is deliberately out, even for Windows. It is path syntax in exactly
 * one place — straight after a drive letter, where {@link linkable} spells it
 * out — and letting a segment hold one would swallow `note:`, every `file:line`
 * a compiler prints, and the scheme of every URL a transcript quotes.
 */
const SEG = String.raw`[\p{L}\p{N}_.+@%-]`;

/**
 * What separates two segments.
 *
 * Windows takes either spelling from every API it has, and transcripts mix them
 * inside a single message: an agent writes `src/lib/a.ts` while the shell it
 * just ran echoes `src\lib\a.ts` back. So both are separators there, and neither
 * is ever a segment character.
 */
const separator = (windows: boolean) => (windows ? String.raw`[/\\]` : "/");

/**
 * What may not precede a match.
 *
 * It stops a match starting mid-token, which is what separates a path from the
 * second half of `and/or`, so it lists every character {@link SEG} holds plus
 * `~` and the separators. One left out leaves a path reachable mid-token
 * through it.
 *
 * Windows adds `\` for that same reason and `:` for a sharper one: without the
 * colon `C:\code\a.ts` still matched, but from the backslash — `\code\a.ts`,
 * read as rooted, with the drive silently gone — and on a one-drive machine that
 * prefix exists often enough to open the wrong file rather than none.
 */
const behind = (windows: boolean) =>
  windows
    ? String.raw`(?<![\p{L}\p{N}_~./\\:@%+-])`
    : String.raw`(?<![\p{L}\p{N}_~./@%+-])`;

/**
 * A path, or the marker an agent CLI writes where a pasted image was.
 *
 * One alternation rather than two passes, so the path inside a marker cannot be
 * read twice: once on its own and again as the marker around it.
 *
 * The shapes, in the order they are tried. A UNC share (`\\nas\shots\a.png`)
 * goes first because nothing else can reach it: every other shape demands a
 * segment after its first separator and so stops dead on the second backslash,
 * and by the time the engine has walked past both, `behind` has blocked the
 * rest. Then a drive-letter root, then `/` or `~` rooted, then bare —
 * `src/lib/links.ts`, which means nothing without a session to read it against.
 * Agents write far more bare ones than rooted ones, and it is the looser shape
 * by a wide margin, so {@link Patterns.dottedTail} and the file probe carry the
 * weight of rejecting prose that merely holds a separator.
 */
function linkable(windows: boolean): RegExp {
  const s = separator(windows);
  const seg = `${SEG}+`;
  // A lone leading backslash roots nothing, even on Windows. Transcripts are
  // full of `\n` and `\t`, and a rooted match is probed without the dotted-tail
  // rule that keeps prose out — one `\d` naming a real directory-relative file
  // is worse than the loss, which is the drive-relative `\Users\aki\a.txt` that
  // nothing here could resolve anyway without knowing the current drive. The
  // tail of one is not picked up as a bare path either: `behind` holds the
  // backslash, so `Users\aki\a.txt` cannot match on its own and be read against
  // the session directory instead.
  const rooted = windows
    ? String.raw`(?:~?/|~\\)${seg}(?:${s}${seg})*`
    : `~?(?:${s}${seg})+`;
  const bare = `${seg}(?:${s}${seg})+`;
  const roots = windows
    ? [String.raw`\\\\${seg}(?:${s}${seg})+`, `[A-Za-z]:(?:${s}${seg})+`]
    : [];
  // A drive with nothing after it is not a path: `C:` and `C:\` both fail for
  // want of a segment, and the shapes below cannot pick the remainder up.
  const path = `${behind(windows)}(?:${[...roots, rooted, bare].join("|")})`;
  return new RegExp(String.raw`\[Image: source: ([^\]\n]+)\]|${path}`, "gu");
}

/**
 * The patterns whose shape turns on the platform. Both sets are built at load,
 * so either is reachable from the unit suite whatever host it runs on, and a
 * global regex is safe to share because `matchAll` clones it rather than
 * advancing the original.
 */
interface Patterns {
  /** {@link linkable}, for this platform. */
  linkable: RegExp;
  /**
   * A root: what makes a path name a location outright rather than one to be
   * looked for under the session directory. Windows has four — a drive, a UNC
   * share, a leading separator, and a home prefix in either spelling, which is
   * exactly what `expandTilde` expands.
   *
   * The leading backslash {@link linkable} refuses to pluck out of prose is
   * accepted here, because an image marker's source does not come from prose:
   * the CLI wrote it as a path, and Windows resolves `\shots\a.png` against the
   * current drive rather than against the session, so probing it as rooted is
   * what the marker means.
   */
  rooted: RegExp;
  /**
   * A bare relative path, whole. {@link linkable} already shapes what it finds
   * in prose, but an image marker's source arrives straight from between the
   * brackets and has never been through it — and a marker names a bare filename
   * with spaces in it often enough that resolving one against the session
   * directory turned a sentence into an embed.
   */
  relative: RegExp;
  /**
   * What a bare relative match needs before it is worth probing for: a dot in
   * the last segment. Nothing else separates `src/lib/links.ts` from `and/or`,
   * `24/7` or `read/write` cheaply, and without it every slash in ordinary prose
   * costs a filesystem round trip.
   *
   * Both separators end a segment on Windows, or `either.or\then` reads as a
   * dotted tail spanning the backslash and buys the walk the rule exists to
   * avoid.
   *
   * Extensionless files are the deliberate loss. Finding `bin/setup` would mean
   * probing every `either/or` in every transcript to catch it.
   */
  dottedTail: RegExp;
  /**
   * What may follow a match without it being a truncation. A separator means the
   * segment after it held a character the class rejects, and `…` is where
   * `corpus.ts` cut a long message; either way the match is a prefix of the real
   * path, and a prefix that happens to exist names the wrong file.
   */
  truncated: RegExp;
}

function buildPatterns(windows: boolean): Patterns {
  const s = separator(windows);
  return {
    linkable: linkable(windows),
    rooted: windows ? /^(?:[A-Za-z]:[/\\]|\\\\|[/\\]|~[/\\])/ : /^(?:\/|~\/)/,
    relative: new RegExp(`^${SEG}+(?:${s}${SEG}+)+$`, "u"),
    dottedTail: windows ? /\.[^./\\]+$/ : /\.[^./]+$/,
    truncated: windows ? /^[/\\…]/ : /^[/…]/,
  };
}

const POSIX_PATTERNS = buildPatterns(false);
const WINDOWS_PATTERNS = buildPatterns(true);

/** Punctuation a path collects from the sentence it sits in, never part of it. */
const TRAILING = /[.,;:!?)\]]+$/;

/**
 * Characters that put a marker inside someone else's syntax: an HTML attribute,
 * an existing link target, an autolink. Rewriting there produces markup nested
 * inside markup, which renders as neither.
 */
const ENCLOSING = "\"'(<=";

/** Whether a path names a file that exists. */
type IsFile = (path: string) => boolean;

/** The subdirectories of `dir`, or nothing where it cannot be read. */
type ListDirs = (dir: string) => string[];

/** The width of an image in pixels, or null where its bytes do not say. */
type PixelWidth = (file: string) => number | null;

export interface LinkOptions {
  /**
   * The session's working directory, which is what a bare relative path is read
   * against. Without it only absolute and home-relative paths resolve.
   */
  cwd?: string;
  /** File probe, injected by tests; defaults to the real filesystem. */
  isFile?: IsFile;
  /** Directory probe, injected by tests; defaults to the real filesystem. */
  listDirs?: ListDirs;
  /** Image measure, injected by tests; defaults to reading the file. */
  pixelWidth?: PixelWidth;
}

/**
 * Directories a relative path is never looked for in. Package and build trees
 * hold thousands of plausible `src/index.ts` matches that no transcript ever
 * means, and walking them would dominate the search on its own.
 */
const UNSEARCHED = new Set([
  "node_modules",
  "dist",
  "build",
  ".build",
  "vendor",
  "target",
  "coverage",
]);

/**
 * How many directories a relative path may be looked for in. A monorepo two
 * levels deep runs to hundreds, and past that the ambiguity rule below rejects
 * nearly everything anyway; the cap is what stops a pathological tree from
 * making the pane's first render wait on the filesystem.
 */
const MAX_BASES = 256;

/**
 * Directories are excluded even though they exist and `orca file open` accepts
 * them: it opens one as a text buffer and reports success, so nothing downstream
 * can tell the difference. Transcripts name directories constantly, in every
 * `cd` and every echoed cwd, so accepting them would misfire more often than it
 * worked.
 */
function isFileOnDisk(path: string): boolean {
  try {
    return statSync(path, { throwIfNoEntry: false })?.isFile() === true;
  } catch {
    // Unreadable, a symlink loop, no permission: not a file we can offer.
    return false;
  }
}

function listDirsOnDisk(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => entry.name)
      .filter((name) => !UNSEARCHED.has(name));
  } catch {
    return [];
  }
}

/**
 * Everything one pass needs to turn a path into a file, and the memoisation
 * that keeps it affordable. A transcript names the same file repeatedly and the
 * pane rebuilds on every selection change, so a relative path is searched for
 * once per pass and the answer, including "nowhere", is kept.
 *
 * A pass is one call, which for `embedImages` means one message rather than one
 * pane: `renderPane` maps over the window, so a fifteen-message window
 * builds fifteen of these and throws each away. That costs nothing while only
 * image markers reach the resolver and markers are rare — a window whose
 * markers name relative paths would rebuild {@link baseDirs} once per message.
 */
interface Resolver {
  cwd?: string;
  isFile: IsFile;
  listDirs: ListDirs;
  pixelWidth: PixelWidth;
  /** The platform whose path syntax this pass reads and writes. */
  windows: boolean;
  /** {@link Patterns} for that platform, resolved once per pass. */
  p: Patterns;
  /** Built on first relative match; most passes never need it. */
  bases?: string[];
  found: Map<string, string | null>;
}

function newResolver(options: LinkOptions, windows: boolean): Resolver {
  return {
    cwd: options.cwd,
    isFile: options.isFile ?? isFileOnDisk,
    listDirs: options.listDirs ?? listDirsOnDisk,
    pixelWidth: options.pixelWidth ?? pixelWidth,
    windows,
    p: windows ? WINDOWS_PATTERNS : POSIX_PATTERNS,
    found: new Map(),
  };
}

/**
 * One candidate path, spelled the way the platform it is meant for spells them.
 *
 * `join` picks its separator from the host, which would leave the unit suite
 * asserting POSIX candidates for the Windows branch — or the reverse — depending
 * on where it ran. Only the Windows branch needs the substitute; the POSIX one
 * keeps `join`, whose normalisation of a `..` segment the existing behaviour
 * depends on.
 *
 * Both halves are respelled rather than concatenated as they stand. Windows
 * accepts the mixed result, but the path is handed to an editor and shown to a
 * person, and one spelling per path is what they read.
 */
function joinPath(base: string, rest: string, windows: boolean): string {
  if (!windows) return join(base, rest);
  const dir = normalizeSeparators(base, true);
  // A drive or share root ends in a separator already, and a second one there
  // reads as the start of a UNC name rather than as an empty segment.
  const gap = dir.endsWith("\\") ? "" : "\\";
  return `${dir}${gap}${normalizeSeparators(rest, true)}`;
}

/**
 * Where a bare relative path may be rooted: the session's own directory, then
 * two levels beneath it.
 *
 * Two levels is what the transcripts ask for. An agent working in a monorepo
 * writes `src/lib/links.ts` while the session's cwd is the repo root and the
 * file is under `extensions/<name>/`, so resolving against the cwd alone finds
 * only a third of the paths that are really there.
 */
function baseDirs(cwd: string, listDirs: ListDirs, windows: boolean): string[] {
  const bases = [cwd];
  const top = listDirs(cwd);
  for (const name of top) bases.push(joinPath(cwd, name, windows));
  for (const name of top) {
    if (bases.length >= MAX_BASES) break;
    const dir = joinPath(cwd, name, windows);
    for (const child of listDirs(dir))
      bases.push(joinPath(dir, child, windows));
  }
  return bases.slice(0, MAX_BASES);
}

/**
 * The one file a bare relative path names, or null.
 *
 * One is the operative word. A monorepo has an `src/index.ts` under every
 * package, and the transcript's own text gives no way to tell which was meant,
 * so an ambiguous path is dropped. Naming the wrong file is worse than naming
 * none.
 */
function resolveRelative(raw: string, r: Resolver): string | null {
  if (!r.cwd || !r.p.relative.test(raw) || !r.p.dottedTail.test(raw))
    return null;
  const cached = r.found.get(raw);
  if (cached !== undefined) return cached;

  r.bases ??= baseDirs(r.cwd, r.listDirs, r.windows);
  let found: string | null = null;
  for (const base of r.bases) {
    const candidate = joinPath(base, raw, r.windows);
    if (!r.isFile(candidate)) continue;
    if (found) {
      found = null; // Ambiguous; stop rather than pick.
      break;
    }
    found = candidate;
  }
  r.found.set(raw, found);
  return found;
}

/** The file `raw` names, or null when it does not name one. */
function resolve(raw: string, r: Resolver): string | null {
  if (!r.p.rooted.test(raw)) return resolveRelative(raw, r);
  const file = expandTilde(raw);
  // Probed as written, since the filesystem takes either spelling, but returned
  // in the one spelling. This is the module's exit boundary, and a rooted path
  // is the one shape that reaches it without passing through `joinPath`: a
  // transcript naming `C:/code/x.ts` in a tool result and `src/x.ts` in prose
  // would otherwise yield two submenu rows for one file, and the drive-spelled
  // one would defeat `displayPath` and show its whole path in a narrow row.
  return r.isFile(file) ? normalizeSeparators(file, r.windows) : null;
}

/**
 * Splits a match into the path and the sentence punctuation trailing it.
 *
 * A strip that leaves a trailing separator has eaten a `.` or `..` segment
 * rather than a full stop, and the result would then name the parent of what
 * the text says. The whole match is kept in that case, and fails the file probe.
 */
function split(raw: string, windows: boolean): string {
  const trailing = raw.match(TRAILING)?.[0] ?? "";
  if (!trailing) return raw;
  const path = raw.slice(0, -trailing.length);
  const cut = path.endsWith("/") || (windows && path.endsWith("\\"));
  return cut ? raw : path;
}

/**
 * `encodeURIComponent` leaves parentheses alone, and an unescaped one closes the
 * markdown link early. Paths reaching here cannot contain them, but a marker's
 * source can.
 */
function encodeParens(url: string): string {
  return url.replace(/\(/g, "%28").replace(/\)/g, "%29");
}

/**
 * A file as a URL the renderer will load. Encoded per segment: the separators
 * have to survive, and `#` would otherwise truncate the URL at a fragment.
 *
 * Windows spells three shapes, and what tells them apart is the authority — the
 * part between the second slash and the third. A drive path has no host, so the
 * drive follows an empty authority and the URL carries three slashes:
 * `file:///C:/Users/aki/x.png`. A UNC path's server *is* the host, so it fills
 * that slot and the URL carries two: `file://nas/shots/a.png`. Encoding the
 * whole path as one segment instead, which is what splitting on `/` alone did,
 * turned every backslash into `%5C` and left a URL naming a single impossible
 * file — the pane's broken-image icon, on every paste.
 *
 * The drive's colon is left as it stands. Percent-encoded it stops naming a
 * drive at all, and it is legal in the path of a `file:` URL.
 */
function fileUrl(file: string, windows: boolean): string {
  if (!windows)
    return encodeParens(
      `file://${file.split("/").map(encodeURIComponent).join("/")}`,
    );
  const parts = file.split(/[/\\]/);
  // Two empty leading segments is the UNC shape, and the only one with a host.
  if (parts[0] === "" && parts[1] === "")
    return encodeParens(
      `file://${parts.slice(2).map(encodeURIComponent).join("/")}`,
    );
  const drive = /^[A-Za-z]:$/.test(parts[0]);
  const path = parts
    .map((part, i) => (i === 0 && drive ? part : encodeURIComponent(part)))
    .join("/");
  return encodeParens(`file://${drive ? "/" : ""}${path}`);
}

function isImage(file: string): boolean {
  return IMAGE_EXT.has(extname(file).toLowerCase());
}

/**
 * Points an embedded image may draw across.
 *
 * Raycast fits a top-level image to the pane, but inside a blockquote — where
 * every user message sits — it draws the image at its intrinsic size, so a
 * retina paste runs several times the pane's width. An explicit `raycast-width`
 * is honoured in both places and holds the aspect ratio by itself, which is why
 * no height is written.
 *
 * The number is bracketed off a rendered pane rather than reported by any API,
 * as `format.ts`'s budgets are: at 350 the image fills the quote without
 * reaching its edge. A compact window or a larger text size moves that edge
 * unseen.
 */
const IMAGE_POINTS = 350;

/**
 * The width query an embed needs, or nothing where the image already fits.
 *
 * Sizing only what overruns the pane keeps a small paste at the size the
 * renderer draws it: written out at the budget, a 120-pixel crop would be blown
 * up threefold rather than fitted. Pixels are compared against points because
 * that is the equivalence the renderer draws an unconstrained image at.
 *
 * A width the bytes do not give is capped: of the two guesses, overrunning the
 * pane is the worse one.
 */
function sizing(file: string, r: Resolver): string {
  const width = r.pixelWidth(file);
  return width !== null && width <= IMAGE_POINTS
    ? ""
    : `?raycast-width=${IMAGE_POINTS}`;
}

/**
 * The marker alone. {@link linkable} finds these too, but it finds every path
 * beside them, and embedding has nothing to do with a path that is not a
 * marker's source — matching them only to discard them is work done on every
 * stretch of prose in the pane.
 */
const IMAGE_MARKER = /\[Image: source: ([^\]\n]+)\]/g;

/** Replaces the image markers in one stretch of prose with the images. */
function embedLine(text: string, r: Resolver): string {
  return text.replace(
    IMAGE_MARKER,
    (whole: string, marker: string, offset: number) => {
      const before = offset > 0 ? text[offset - 1] : "";
      if (before && ENCLOSING.includes(before)) return whole;

      // The marker stands in for the image, so where the image is still there
      // it gives way to it. Where it is not, and temp pastes are swept within
      // days, the sentence stays as it was — including when the file is not an
      // image at all, which no longer has a link to become.
      const file = resolve(marker.trim(), r);
      if (!file || !isImage(file)) return whole;
      return `![](${fileUrl(file, r.windows)}${sizing(file, r)})`;
    },
  );
}

/**
 * Turns the pasted images a transcript names into the images themselves.
 *
 * The file probe gates it, so a marker whose paste has since been swept stays
 * as the sentence wrote it rather than becoming a broken image.
 *
 * Code is left exactly as written, fenced and indented and inline alike: a
 * marker quoted inside code is being discussed, not displayed. That rule lives
 * in {@link mapProse}, which the search highlighting walks by as well, so the
 * two passes cannot come to disagree about where code ends.
 *
 * `windows` is defaulted rather than read inline, as everywhere else the
 * platform decides something here, so both branches stay reachable from the unit
 * suite whichever host it runs on.
 */
export function embedImages(
  text: string,
  options: LinkOptions = {},
  windows = IS_WINDOWS,
): string {
  const r = newResolver(options, windows);
  return mapProse(text, (part) => embedLine(part, r));
}

/**
 * Every file the text names, in the order it first names them.
 *
 * Unlike {@link embedImages} this reads code too. A transcript writes most of
 * its paths in backticks or inside a fenced diff, and a path is no less real
 * for being quoted — the caller here is an action offering files to open, not a
 * rewrite of what the pane shows, so there is no markup to nest wrongly.
 */
export function findPaths(
  text: string,
  options: LinkOptions = {},
  windows = IS_WINDOWS,
): string[] {
  const r = newResolver(options, windows);
  const files: string[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(r.p.linkable)) {
    const [whole, marker] = match;
    const offset = match.index;
    // A truncated match is a prefix of the real path, and a prefix that happens
    // to exist names the wrong file.
    if (
      marker === undefined &&
      r.p.truncated.test(text.slice(offset + whole.length))
    )
      continue;
    const file = resolve(
      marker === undefined ? split(whole, windows) : marker.trim(),
      r,
    );
    if (!file || seen.has(file)) continue;
    seen.add(file);
    files.push(file);
  }
  return files;
}
