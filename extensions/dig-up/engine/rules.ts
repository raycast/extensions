// What gets indexed (DigUp: Rules.swift, the macOS classifier in Files+Apple.swift, the crawler's project and dataset
// rules in Crawler.swift, and FolderSelection.swift). Pure functions over names and paths; the few that look at the
// disk (the MPEG-TS sniff, a folder's names, a `.git` file) say so.

import { closeSync, constants, fstatSync, openSync, readSync, readdirSync, realpathSync, statSync } from "node:fs";
import type { WalkFile, WalkFileType } from "./helper";
import { hasPrefix, lowercased } from "./searchtext";
import type { FileKind, IndexOptions } from "./types";

export type Classification =
  | { action: "index"; kind: FileKind }
  /** A reason worth reporting ("code or data file"). */
  | { action: "skip"; reason: string }
  /** A type nothing here handles (counted as "other type"). */
  | { action: "ignore" };

const index = (kind: FileKind): Classification => ({ action: "index", kind });
const skip = (reason: string): Classification => ({ action: "skip", reason });
const IGNORE: Classification = { action: "ignore" };

// ---------------------------------------------------------------------------------------------------------------
// Lists (DigUp: Rules.swift, Files+Portable.swift)
// ---------------------------------------------------------------------------------------------------------------

/** Folders never worth walking into. Hidden folders and bundles are skipped by the walk itself. */
// prettier-ignore
export const SKIPPED_FOLDER_NAMES: ReadonlySet<string> = new Set([
  "node_modules", "bower_components", "venv", "site-packages", "__pycache__", "DerivedData", "Pods", "Carthage",
]);

/** Any of these in a folder makes it a code project, where only screenshots are indexed. */
// prettier-ignore
export const PROJECT_MARKERS: readonly string[] = [
  ".git", "package.json", "Package.swift", "pyproject.toml", "setup.py", "requirements.txt", "Cargo.toml",
  "go.mod", "pom.xml", "build.gradle", "build.gradle.kts", "Gemfile", "composer.json", "CMakeLists.txt",
];
const PROJECT_BUNDLE_EXTENSIONS: ReadonlySet<string> = new Set(["xcodeproj", "xcworkspace"]);

// prettier-ignore
export const DOC_EXTENSIONS: ReadonlySet<string> = new Set([
  "txt", "text", "md", "markdown", "rtf", "docx", "doc", "odt", "html", "htm",
]);

/** Source code and data files: never in the main index unless `includeCode`. `ts` and `mts` have their own rule. */
// prettier-ignore
export const CODE_EXTENSIONS: ReadonlySet<string> = new Set([
  "py", "ipynb", "c", "h", "cc", "cpp", "cxx", "hpp", "hh", "m", "mm", "swift", "tsx", "cts", "js", "jsx", "mjs",
  "cjs", "go", "rs", "java", "kt", "kts", "scala", "rb", "php", "cs", "fs", "sh", "bash", "zsh", "fish", "ps1",
  "lua", "pl", "r", "jl", "dart", "sql", "vue", "svelte", "css", "scss", "sass", "less", "json", "jsonl", "yaml",
  "yml", "toml", "xml", "plist", "gradle", "cmake", "mk", "lock", "log", "csv", "tsv", "ini", "cfg", "conf",
  "proto", "graphql", "tf", "nix", "zig", "hs", "ex", "exs", "erl", "clj", "elm", "ml", "vim", "el", "asm",
  "metal", "glsl", "hlsl", "wgsl", "cu", "pyi", "pyc",
]);

export const SCREENSHOT_PREFIXES: readonly string[] = ["Screenshot", "Screen Shot", "CleanShot", "SCR-"];

/** Source files code search reads. */
// prettier-ignore
export const SOURCE_EXTENSIONS: ReadonlySet<string> = new Set([
  "py", "pyi", "pyx", "c", "h", "cc", "cpp", "cxx", "hpp", "hh", "hxx", "m", "mm", "swift", "ts", "tsx", "mts",
  "cts", "js", "jsx", "mjs", "cjs", "go", "rs", "java", "kt", "kts", "scala", "groovy", "rb", "php", "cs", "fs",
  "sh", "bash", "zsh", "fish", "ps1", "lua", "pl", "pm", "r", "jl", "dart", "sql", "vue", "svelte", "astro",
  "html", "htm", "css", "scss", "sass", "less", "gradle", "cmake", "mk", "proto", "graphql", "gql", "tf", "hcl",
  "nix", "zig", "hs", "ex", "exs", "erl", "clj", "cljs", "elm", "ml", "mli", "vim", "el", "lisp", "asm", "s",
  "metal", "glsl", "hlsl", "wgsl", "cu", "cuh", "ino", "v", "sv", "tex",
]);
/** What goes with code: a repo's docs and its settings. */
// prettier-ignore
export const CODE_TEXT_EXTENSIONS: ReadonlySet<string> = new Set([
  "md", "markdown", "rst", "adoc", "org", "txt", "yaml", "yml", "toml",
]);
/** Code known by its name alone. */
// prettier-ignore
export const CODE_FILE_NAMES: ReadonlySet<string> = new Set([
  "Makefile", "makefile", "GNUmakefile", "Dockerfile", "Containerfile", "Justfile", "justfile", "Rakefile",
  "Gemfile", "Podfile", "Brewfile", "Procfile", "Vagrantfile", "Jenkinsfile",
]);
/** Folders code search doesn't go into, besides what git ignores: vendored code and what builds and runs leave. */
// prettier-ignore
export const CODE_SKIPPED_FOLDER_NAMES: ReadonlySet<string> = new Set([
  "vendor", "Vendor", "vendored", "third_party", "third-party", "thirdparty", "3rdparty", "external", "extern",
  "deps", "build", "Build", "dist", "out", "target", "obj", "coverage", "htmlcov", "generated", "__generated__",
  "wandb", "mlruns", "lightning_logs",
]);

// What macOS gets from the type system, as extension sets: used when the walk reports no type (DigUp's portable
// classifier). They add the formats macOS has no type for (webm, mkv, ogg, opus, …), which ffmpeg reads.
// prettier-ignore
export const IMAGE_EXTENSIONS: ReadonlySet<string> = new Set([
  "jpg", "jpeg", "jpe", "jfif", "png", "gif", "bmp", "tif", "tiff", "webp", "heic", "heif", "avif", "psd", "tga",
  "pnm", "ppm", "pgm", "cr2", "nef", "arw", "dng", "raf", "orf", "rw2",
]);
// prettier-ignore
export const AUDIO_EXTENSIONS: ReadonlySet<string> = new Set([
  "mp3", "m4a", "m4b", "aac", "wav", "wave", "flac", "ogg", "oga", "opus", "aiff", "aif", "wma", "amr", "caf", "mka",
]);
// prettier-ignore
export const VIDEO_EXTENSIONS: ReadonlySet<string> = new Set([
  "mp4", "m4v", "mov", "mkv", "webm", "avi", "wmv", "flv", "3gp", "3g2", "mpg", "mpeg", "m2v", "ogv", "mxf",
]);

// prettier-ignore
const SECRET_TYPES: ReadonlySet<string> = new Set([
  "pem", "key", "p12", "pfx", "keystore", "jks", "ppk", "kdbx", "gpg", "asc", "crt", "cer", "der", "p8",
  "mobileprovision",
]);
// prettier-ignore
const SECRET_PREFIXES: readonly string[] = [
  "id_rsa", "id_dsa", "id_ecdsa", "id_ed25519", ".env", "secret", "credential", ".netrc", ".npmrc", ".pypirc",
  "htpasswd", ".htpasswd",
];
const LICENSE_PREFIXES: readonly string[] = ["license", "licence", "copying", "notice"];
// prettier-ignore
const CAMERA_PREFIXES: readonly string[] = [
  "img", "dsc", "pxl", "mvimg", "vid", "gopr", "dji", "photo", "whatsapp", "screenshot",
];

// ---------------------------------------------------------------------------------------------------------------
// Names and paths, as Foundation reads them
// ---------------------------------------------------------------------------------------------------------------

/** A path as NSString reads it: repeated slashes as one, and none at the end (but "/" itself). */
function tidyPath(path: string): string {
  const single = path.includes("//") ? path.replace(/\/{2,}/g, "/") : path;
  return single.length > 1 && single.endsWith("/") ? single.slice(0, -1) : single;
}

/** NSString's `lastPathComponent`: "/a/b/" → "b", "/" → "/". */
export function lastPathComponent(path: string): string {
  const tidy = tidyPath(path);
  return tidy === "/" ? tidy : tidy.slice(tidy.lastIndexOf("/") + 1);
}

/** NSString's `deletingLastPathComponent`: "/a/b" → "/a", "/a//b" → "/a", "/a" → "/", "/" → "/", "a" → "". */
export function parentPath(path: string): string {
  const tidy = tidyPath(path);
  const slash = tidy.lastIndexOf("/");
  if (slash < 0) return "";
  return slash === 0 ? "/" : tidy.slice(0, slash);
}

const NON_ASCII = /[\u0080-\uffff]/;

/** The form paths are compared in. Swift compares strings by canonical equivalence: an NFC "Žádosti" is the NFD one. */
function canonical(path: string): string {
  return NON_ASCII.test(path) ? path.normalize("NFC") : path;
}

function samePath(a: string, b: string): boolean {
  return a === b || canonical(a) === canonical(b);
}

/** Foundation's `pathExtension` of a file name, as written: none for ".env", "a.", "..a" or one with a space. */
export function pathExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "";
  const stem = name.slice(0, dot);
  const ext = name.slice(dot + 1);
  if (stem === "" || stem === "." || stem === ".." || ext === "" || ext.includes(" ")) return "";
  return ext;
}

/** `deletingPathExtension` of a file name. */
export function deletingPathExtension(name: string): string {
  const ext = pathExtension(name);
  return ext === "" ? name : name.slice(0, name.length - ext.length - 1);
}

/** Characters Foundation's file-system form leaves composed (Apple's HFS+ exclusions, and two Unicode 16 letters its
 *  table predates). */
const FS_KEPT = /[\u2000-\u2fff\uf900-\ufaff\u{2f800}-\u{2faff}\u{105c9}\u{105e4}]/u;
/** Starters whose decomposition starts with a mark (Tibetan ཱི ཱུ ཱྀ): Foundation reorders marks after them, not across. */
const FS_BARRIER = /[\u0f73\u0f75\u0f81]/u;

/**
 * Text as `URL(fileURLWithPath:)` gives it back (`.path`, `.lastPathComponent`): decomposed, as NFD, except for the
 * characters in FS_KEPT, which still take part in the reordering of marks, and FS_BARRIER, which marks before them
 * don't reorder across. DigUp builds the titles it embeds this way, so "Résumé.txt" reaches the model as
 * "Re\u0301sume\u0301". Checked against swiftc (Swift 6.3.1, macOS 26) on every scalar and on 86,632 mixed names,
 * with Node's ICU 78.3.
 */
export function fileSystemForm(text: string): string {
  if (!NON_ASCII.test(text)) return text; // (it tests UTF-16 units, so surrogates count as non-ASCII)
  if (!FS_KEPT.test(text) && !FS_BARRIER.test(text)) return text.normalize("NFD");
  let out = "";
  let run = "";
  for (const character of text) {
    if (FS_KEPT.test(character) && character.normalize("NFD") !== character) {
      // A kept character that NFD would change is a starter: marks never reorder across it.
      out += run.normalize("NFD") + character;
      run = "";
    } else if (FS_BARRIER.test(character)) {
      out += run.normalize("NFD");
      run = character;
    } else {
      run += character;
    }
  }
  return out + run.normalize("NFD");
}

/** The lowercased extension the classifiers compare. */
function lowerExtension(path: string): string {
  return lowercased(pathExtension(lastPathComponent(path)));
}

/** File extensions as people write them ("HEIC, .txt *.md") → ["heic", "txt", "md"] (DigUp: IndexOptions.extensions). */
export function parseExtensions(text: string): string[] {
  const words = text.split(/[,\p{White_Space}]+/u).map((word) => lowercased(word.replace(/^[*.]+/, "")));
  return [...new Set(words.filter((word) => word !== ""))];
}

// ---------------------------------------------------------------------------------------------------------------
// The main index
// ---------------------------------------------------------------------------------------------------------------

/** MPEG-TS packets start with 0x47 every 188 bytes (or every 192 with a 4-byte timecode, as in .m2ts / AVCHD .mts).
 *  Reads the first 600 bytes; a shorter file, or one that can't be read, isn't video. Opened without blocking and read
 *  only when it's a regular file, so a FIFO named .ts can't stall the daemon (DigUp's crawl has a thread to stall). */
export function isMPEGTransportStream(path: string): boolean {
  let fd: number;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NONBLOCK);
  } catch {
    return false;
  }
  try {
    if (!fstatSync(fd).isFile()) return false;
    const bytes = Buffer.alloc(600);
    const read = readSync(fd, bytes, 0, 600, 0);
    if (read < 400) return false;
    return (
      (bytes[0] === 0x47 && bytes[188] === 0x47 && bytes[376] === 0x47) ||
      (bytes[4] === 0x47 && bytes[196] === 0x47 && bytes[388] === 0x47)
    );
  } catch {
    return false;
  } finally {
    closeSync(fd);
  }
}

/** macOS marks screenshots with an extended attribute (`kMDItemIsScreenCapture`, from the walk); names are the
 *  fallback. */
export function isScreenshot(name: string, marker = false): boolean {
  return marker || SCREENSHOT_PREFIXES.some((prefix) => hasPrefix(name, prefix));
}

/** Keys, certificates, password and credential files: the code index never reads them. A prefix test, so it also
 *  catches "secrets.yaml" and "secretary.py". The main index doesn't ask (DigUp: Rules.swift calls it from classifyCode
 *  only); key and certificate types are in none of its lists anyway. */
export function isSecret(name: string): boolean {
  const lower = lowercased(name);
  return SECRET_TYPES.has(pathExtension(lower)) || SECRET_PREFIXES.some((prefix) => hasPrefix(lower, prefix));
}

/** Text that holds a private key. DigUp checks this for code only (CodeExtractor.check); the main index doesn't. */
export function holdsPrivateKey(text: string): boolean {
  return text.includes("PRIVATE KEY-----");
}

/** What the walk knows of a file. A file that isn't downloaded is not opened: reading it would download it. */
export type FileFacts = Pick<WalkFile, "dataless" | "inCloud">;

const IN_THE_CLOUD = "in the cloud, not downloaded";
const isNotDownloaded = (file?: FileFacts) => file !== undefined && (file.dataless || file.inCloud);

/**
 * Whether the main index reads a file, and as what (DigUp's macOS classifier, `Files+Apple.swift`). `type` is the
 * UTType conformance the walk reports; without one, the extension lists decide (DigUp's portable classifier).
 * With `file`, a .ts that isn't downloaded is left in the cloud (the crawl's reason) instead of being read to tell
 * TypeScript from video, which DigUp does, downloading it.
 */
export function classify(
  path: string,
  type: WalkFileType | undefined,
  options: Pick<IndexOptions, "excludedExtensions" | "includeCode">,
  screenshotMarker = false,
  file?: FileFacts,
): Classification {
  const name = lastPathComponent(path);
  const ext = lowerExtension(path);
  if (options.excludedExtensions.includes(ext)) return skip("excluded type");
  const codeOrData = options.includeCode ? index("doc") : skip("code or data file");
  // .ts / .mts are usually TypeScript, which Spotlight calls MPEG-2 video. Only a real transport stream is video.
  if (ext === "ts" || ext === "mts" || ext === "m2ts") {
    if (isNotDownloaded(file)) return skip(IN_THE_CLOUD);
    return isMPEGTransportStream(path) ? index("video") : codeOrData;
  }
  if (DOC_EXTENSIONS.has(ext)) return index("doc");
  if (CODE_EXTENSIONS.has(ext)) return codeOrData;
  const image = () => index(isScreenshot(name, screenshotMarker) ? "screenshot" : "image");
  if (type == null) {
    if (SOURCE_EXTENSIONS.has(ext)) return codeOrData;
    if (ext === "pdf") return index("pdf");
    if (IMAGE_EXTENSIONS.has(ext)) return image();
    if (VIDEO_EXTENSIONS.has(ext)) return index("video");
    if (AUDIO_EXTENSIONS.has(ext)) return index("audio");
    return IGNORE;
  }
  switch (type) {
    case "sourceCode":
      return codeOrData;
    case "pdf":
      return index("pdf");
    case "image":
      return image();
    case "movie":
      return index("video");
    case "audio":
      return index("audio");
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The code index
// ---------------------------------------------------------------------------------------------------------------

/** What code search reads in the code folders: source files, a repo's docs and settings, and notebooks. Never data
 *  (json, csv, lockfiles, logs), minified bundles, licenses, or anything that looks like a key or a password file. */
export function classifyCode(
  path: string,
  options: Pick<IndexOptions, "excludedExtensions">,
  file?: FileFacts,
): Classification {
  const name = lastPathComponent(path);
  const ext = lowerExtension(path);
  if (options.excludedExtensions.includes(ext)) return skip("excluded type");
  if (isSecret(name)) return skip("key or password file");
  const lower = lowercased(name);
  if (lower.endsWith(".min.js") || lower.endsWith(".min.mjs") || lower.endsWith(".min.css")) return skip("minified");
  if (LICENSE_PREFIXES.some((prefix) => hasPrefix(lower, prefix))) return skip("license");
  if (ext === "ts" || ext === "mts") {
    if (isNotDownloaded(file)) return skip(IN_THE_CLOUD);
    if (isMPEGTransportStream(path)) return IGNORE; // a video
  }
  if (
    SOURCE_EXTENSIONS.has(ext) ||
    CODE_TEXT_EXTENSIONS.has(ext) ||
    ext === "ipynb" ||
    CODE_FILE_NAMES.has(name) ||
    hasPrefix(name, "Dockerfile")
  ) {
    return index("code");
  }
  if (CODE_EXTENSIONS.has(ext)) return skip("data file"); // json, csv, lockfiles, logs, plists
  return IGNORE;
}

/** How a folder's `.git` looks: a folder (a repo), a file (a submodule or a worktree), or none. */
export type GitDir = "dir" | "file" | null;

/** Like FileManager.fileExists: a `.git` that can't be looked at (a locked folder, a link loop) isn't there. */
function gitDirOf(folder: string): GitDir {
  try {
    const info = statSync(`${folder}/.git`, { throwIfNoEntry: false });
    return info ? (info.isDirectory() ? "dir" : "file") : null;
  } catch {
    return null;
  }
}

/** Why code search doesn't go into a folder, or null. `gitDir` as the walk saw it; omitted, the disk is asked. */
export function codeSkipReason(folder: string, gitDir?: GitDir): string | null {
  if (CODE_SKIPPED_FOLDER_NAMES.has(lastPathComponent(folder))) return "vendored or built code";
  // A submodule or a worktree (".git" is a file there): someone else's code, or a copy of a repo's own.
  if ((gitDir === undefined ? gitDirOf(folder) : gitDir) === "file") return "submodule or worktree";
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Folders
// ---------------------------------------------------------------------------------------------------------------

/** Why the walk doesn't go into a folder (below a chosen one), or null. `excluded`: absolute paths. */
export function skipReason(folder: string, home: string, excluded: readonly string[]): string | null {
  const name = lastPathComponent(folder);
  if (SKIPPED_FOLDER_NAMES.has(name)) return "developer folder";
  if (name.endsWith(".noindex")) return ".noindex folder";
  if (samePath(folder, home + "/Library")) return "~/Library";
  const path = canonical(folder);
  if (excluded.some((skipped) => samePath(path, skipped) || hasPrefix(path, canonical(skipped) + "/"))) {
    return "excluded folder";
  }
  return null;
}

/** Whether a change the folder watcher reports at `path` is where the crawl of `root` goes: not inside a folder it
 *  skips (hidden, .noindex and developer folders, ~/Library, the skipped ones). */
export function isWalked(path: string, root: string, home: string, excluded: readonly string[]): boolean {
  const [inner, outer] = [canonical(path), canonical(root)];
  if (inner !== outer && !FolderSelection.isInside(inner, outer)) return false;
  let folder = outer;
  for (const part of inner.slice(outer.length).split("/")) {
    if (part === "") continue;
    folder += "/" + part;
    if (hasPrefix(part, ".") || skipReason(folder, home, excluded) !== null) return false;
  }
  return true;
}

/** Whether a folder holding these names (hidden ones included) is a code project. */
export function isProjectRoot(names: Iterable<string>): boolean {
  const set = new Set(names);
  return (
    PROJECT_MARKERS.some((marker) => set.has(marker)) ||
    [...set].some((name) => PROJECT_BUNDLE_EXTENSIONS.has(pathExtension(name)))
  );
}

/** `isProjectRoot` of a folder on disk; false when it can't be read. */
export function isProjectRootFolder(folder: string): boolean {
  try {
    return isProjectRoot(readdirSync(folder));
  } catch {
    return false;
  }
}

/** Machine-made names like "clip_000123", "frame-0042" or "3f9a1c0e-…", but not camera names like "IMG_1234". */
export function looksMachineNamed(stem: string): boolean {
  const name = lowercased(stem);
  if (CAMERA_PREFIXES.some((prefix) => hasPrefix(name, prefix))) return false;
  if (/^[0-9a-f]{8,}([-_][0-9a-f]{4,})*$/.test(name)) return true;
  // ICU's \d is any decimal digit.
  return /^[a-z]{0,16}[-_. ]?\p{Nd}{3,}([-_.]\p{Nd}+)*$/u.test(name);
}

/** Folders with hundreds of same-kind, machine-named media files: training data, not your stuff. Roots you pick
 *  yourself are never datasets. Returns folder → files of its qualifying kinds. */
export function datasetFolders(
  files: Iterable<{ folder: string; stem: string; kind: FileKind }>,
  roots: ReadonlySet<string>,
  minimum = 300,
): Record<string, number> {
  // Keyed as Swift keys a dictionary of paths (by canonical equivalence), named by the first spelling seen.
  const rootSet = new Set([...roots].map(canonical));
  const groups = new Map<string, { folder: string; kinds: Map<FileKind, string[]> }>();
  for (const file of files) {
    const key = canonical(file.folder);
    if (!(file.kind === "image" || file.kind === "audio" || file.kind === "video") || rootSet.has(key)) continue;
    let group = groups.get(key);
    if (!group) groups.set(key, (group = { folder: file.folder, kinds: new Map() }));
    const stems = group.kinds.get(file.kind);
    if (stems) stems.push(file.stem);
    else group.kinds.set(file.kind, [file.stem]);
  }
  const datasets: Record<string, number> = {};
  for (const { folder, kinds } of groups.values()) {
    for (const stems of kinds.values()) {
      if (stems.length < minimum) continue;
      const machine = stems.filter(looksMachineNamed).length;
      if (machine / stems.length >= 0.7) datasets[folder] = (datasets[folder] ?? 0) + stems.length;
    }
  }
  return datasets;
}

export interface CandidateLike {
  path: string;
  kind: FileKind;
}

/**
 * The crawl's last two rules (DigUp: Crawler.swift), over the files the walk kept. Inside a code project only
 * screenshots count (its folder or any folder above it, up to the chosen root's, is in `projectRoots`); then, unless
 * `includeDatasets`, every image, audio and video file in a dataset folder is left out. Neither applies to the code
 * index. `roots`: the chosen folders, as given to the walk.
 */
export function keepCandidates<T extends CandidateLike>(
  found: readonly T[],
  o: { projectRoots: Iterable<string>; roots: Iterable<string>; code: boolean; includeDatasets: boolean },
): { kept: T[]; skipped: Record<string, number>; datasets: Record<string, number> } {
  const skipped: Record<string, number> = {};
  if (o.code) return { kept: [...found], skipped, datasets: {} };
  const projectRoots = new Set([...o.projectRoots].map(canonical));
  const known = new Map<string, boolean>();
  const inProject = (folder: string): boolean => {
    let answer = known.get(folder);
    if (answer === undefined) {
      const parent = parentPath(folder);
      answer = projectRoots.has(folder) || (parent !== folder && parent.length > 1 && inProject(parent));
      known.set(folder, answer);
    }
    return answer;
  };
  let kept = found.filter((file) => {
    if (file.kind === "screenshot" || !inProject(canonical(parentPath(file.path)))) return true;
    skipped["inside a code project"] = (skipped["inside a code project"] ?? 0) + 1;
    return false;
  });
  let datasets: Record<string, number> = {};
  if (!o.includeDatasets) {
    const media = (kind: FileKind) => kind === "image" || kind === "audio" || kind === "video";
    datasets = datasetFolders(
      kept.map((file) => ({
        folder: parentPath(file.path),
        stem: deletingPathExtension(lastPathComponent(file.path)),
        kind: file.kind,
      })),
      new Set(o.roots),
    );
    const datasetKeys = new Set(Object.keys(datasets).map(canonical));
    if (datasetKeys.size > 0) {
      kept = kept.filter((file) => {
        if (!(media(file.kind) && datasetKeys.has(canonical(parentPath(file.path))))) return true;
        skipped["dataset"] = (skipped["dataset"] ?? 0) + 1;
        return false;
      });
    }
  }
  return { kept, skipped, datasets };
}

// ---------------------------------------------------------------------------------------------------------------
// FolderSelection
// ---------------------------------------------------------------------------------------------------------------

/** A folder's checkbox: all of it, some of its subfolders, or none. */
export type FolderMark = "on" | "mixed" | "off";

/** Each path once (by canonical equivalence, as a Swift `Set` keeps them), in order. Frozen: a selection's arrays never
 *  change under whoever holds them; changes make new ones. */
function unique(paths: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const once = paths.filter((path) => {
    const key = canonical(path);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return Object.freeze(once);
}

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((path, at) => samePath(path, b[at]));

/**
 * Which folders are searched: the folders you chose, minus the folders you skipped inside them. A skip applies inside
 * the chosen folders that contain it, and a chosen folder is searched whole even inside a skipped one (skip
 * Downloads/Media, still choose Downloads/Media/Courses). Paths are compared by whole components, and by canonical
 * equivalence. A value, as in DigUp: the arrays it hands out never change; the setters replace them.
 */
export class FolderSelection {
  private _chosen: readonly string[];
  private _skipped: readonly string[];
  /** Folders already searched (when settings add more): whatever is clicked, they stay. */
  readonly kept: readonly string[];

  constructor(o: { chosen?: readonly string[]; skipped?: readonly string[]; kept?: readonly string[] } = {}) {
    this._chosen = unique(o.chosen ?? []);
    this._skipped = unique(o.skipped ?? []);
    this.kept = unique(o.kept ?? []);
  }

  get chosen(): readonly string[] {
    return this._chosen;
  }

  get skipped(): readonly string[] {
    return this._skipped;
  }

  /** The same choices (DigUp's `Equatable`). */
  equals(other: FolderSelection): boolean {
    return (
      sameList(this.chosen, other.chosen) && sameList(this.skipped, other.skipped) && sameList(this.kept, other.kept)
    );
  }

  static isInside(path: string, folder: string): boolean {
    const inside = canonical(folder);
    return hasPrefix(canonical(path), inside.endsWith("/") ? inside : inside + "/");
  }

  static parent(path: string): string {
    return parentPath(path);
  }

  static isSearched(path: string, folders: readonly string[], skipped: readonly string[]): boolean {
    return folders.some(
      (folder) =>
        (samePath(path, folder) || FolderSelection.isInside(path, folder)) &&
        !skipped.some(
          (skip) =>
            FolderSelection.isInside(skip, folder) && (samePath(path, skip) || FolderSelection.isInside(path, skip)),
        ),
    );
  }

  /** The path as a walk of the folder reports it (/private/var where the folder was given as /var). */
  static realPath(path: string): string {
    try {
      return realpathSync.native(path);
    } catch {
      return path;
    }
  }

  /** Whether `path` (a folder or a file) is searched. */
  isSearched(path: string): boolean {
    return FolderSelection.isSearched(path, [...this.kept, ...this.chosen], this.skipped);
  }

  /** The closest chosen (or kept) folder that searches `path`. */
  searchedAs(path: string): string | null {
    let best: string | null = null;
    for (const folder of [...this.kept, ...this.chosen]) {
      if (!samePath(path, folder) && !FolderSelection.isInside(path, folder)) continue;
      if (!FolderSelection.isSearched(path, [folder], this.skipped)) continue;
      if (best === null || canonical(folder).length > canonical(best).length) best = folder;
    }
    return best;
  }

  /** What the indexer gets: kept and chosen folders, without those another one already searches whole. */
  get folders(): string[] {
    const all = unique([...this.kept, ...this.chosen]);
    return all.filter(
      (folder) =>
        !all.some(
          (other) =>
            !samePath(other, folder) &&
            FolderSelection.isInside(folder, other) &&
            FolderSelection.isSearched(folder, [other], this.skipped),
        ),
    );
  }

  /** The skips that leave something out (inside a folder that's searched). */
  get effectiveSkips(): string[] {
    const folders = this.folders;
    return this.skipped.filter((skip) => folders.some((folder) => FolderSelection.isInside(skip, folder)));
  }

  /** Mixed when some of its subfolders are skipped (it's searched) or chosen (it isn't). */
  mark(folder: string): FolderMark {
    const isChild = (path: string) => samePath(parentPath(path), folder);
    if (this.isSearched(folder)) {
      return this.skipped.some((skip) => isChild(skip) && !this.isSearched(skip)) ? "mixed" : "on";
    }
    return [...this.kept, ...this.chosen].some(isChild) ? "mixed" : "off";
  }

  /** Checks or unchecks a folder and its subfolders: all of it, or none of it. */
  setFolder(folder: string, on: boolean): void {
    const isChild = (path: string) => samePath(parentPath(path), folder);
    this._skipped = Object.freeze(this._skipped.filter((path) => !isChild(path)));
    this._chosen = Object.freeze(this._chosen.filter((path) => !isChild(path)));
    this.setSubfolder(folder, on);
  }

  /** Checks or unchecks one folder, leaving the choices inside it as they are. */
  setSubfolder(folder: string, on: boolean): void {
    if (on) {
      this.unskip(folder);
      if (!this.isSearched(folder)) this._chosen = Object.freeze([...this._chosen, folder]);
    } else {
      this._chosen = Object.freeze(this._chosen.filter((path) => !samePath(path, folder)));
      if (this.isSearched(folder)) this._skipped = Object.freeze([...this._skipped, folder]);
    }
  }

  /** Stops skipping `folder` (without choosing it). */
  unskip(folder: string): void {
    this._skipped = Object.freeze(this._skipped.filter((path) => !samePath(path, folder)));
  }
}
