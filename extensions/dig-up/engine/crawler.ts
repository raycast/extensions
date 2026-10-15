// Which files the chosen folders hold (DigUp: Crawler.swift). The Swift helper walks the folders (FileManager's
// enumerator: hidden files and packages skipped, the folder rules applied) and reports each file's facts once; the rules
// in rules.ts decide here what is indexed, as what, and why the rest isn't. Metadata only: nothing is read but the
// 600-byte MPEG-TS sniff, and, for the code index, the list of files git keeps in each repo.

import { execFile } from "node:child_process";
import { existsSync, readlinkSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import type { Helper, WalkFile } from "./helper";
import {
  SKIPPED_FOLDER_NAMES,
  classify,
  classifyCode,
  keepCandidates,
  lastPathComponent,
  parentPath,
  pathExtension,
} from "./rules";
import { lowercased } from "./searchtext";
import type { Candidate } from "./store";
import type { IndexOptions } from "./types";

export interface CrawlReport {
  candidates: Candidate[];
  /** Reason → files left out. */
  skipped: Record<string, number>;
  /** Reason → folders not walked into. */
  skippedFolders: Record<string, number>;
  /** Folder → files skipped as a dataset. */
  datasets: Record<string, number>;
}

export interface CrawlDeps {
  helper: Pick<Helper, "walk">;
  home?: string;
  /** The git to ask which files a repo keeps (`findGit()` by default); null: none, every file counts. */
  git?: string | null;
}

/** What the walk itself leaves out is a file ("app or bundle": a package is one thing to the Finder) or a folder. */
const FILE_REASONS: ReadonlySet<string> = new Set(["app or bundle"]);

const add = (counts: Record<string, number>, reason: string, n = 1) => {
  counts[reason] = (counts[reason] ?? 0) + n;
};

/** A folder as `URL.standardizedFileURL.path` spells it: absolute, no `.` or `..`, no trailing slash. */
export function standardized(path: string): string {
  return resolve(path);
}

/**
 * Walks `roots` and applies DigUp's rules. With `options.code` it walks code folders instead: code files only, in a git
 * repo only those git keeps, none in vendored or built folders.
 */
export async function crawl(roots: readonly string[], options: IndexOptions, deps: CrawlDeps): Promise<CrawlReport> {
  const home = deps.home ?? homedir();
  const rootPaths = roots.map(standardized);
  const report: CrawlReport = { candidates: [], skipped: {}, skippedFolders: {}, datasets: {} };
  if (rootPaths.length === 0) return report;

  const walk = await deps.helper.walk({
    roots: rootPaths,
    skipNames: [...SKIPPED_FOLDER_NAMES],
    skipSuffixes: [".noindex"],
    excluded: options.excludedFolders,
    home,
    code: options.code,
  });
  for (const [reason, count] of Object.entries(walk.skipped)) {
    add(FILE_REASONS.has(reason) ? report.skipped : report.skippedFolders, reason, count);
  }

  const projectRoots: string[] = [];
  const repos = options.code ? new GitRepos(deps.git === undefined ? findGit() : deps.git) : null;
  if (repos) {
    for (const root of rootPaths) await repos.enterRoot(root);
    for (const dir of walk.dirs) if (dir.gitDir === "dir") await repos.enter(dir.path);
  } else {
    for (const dir of walk.dirs) if (dir.projectRoot) projectRoots.push(dir.path);
  }

  const found: Candidate[] = [];
  const seen = new Set<string>(); // the helper drops a file walked twice already; this keeps DigUp's rule here too
  for (const file of walk.files) {
    const kind = indexedKind(file, options, report);
    if (kind === null) continue;
    if (!file.regular) {
      add(report.skipped, "link or special file");
      continue;
    }
    // Reading a dataless placeholder (iCloud "Optimize Mac Storage", File Providers) downloads it.
    if (file.dataless || file.inCloud) {
      add(report.skipped, "in the cloud, not downloaded");
      continue;
    }
    if (repos) {
      // Too big to be written by hand; a notebook's file holds its outputs too.
      const limit =
        lowercased(pathExtension(lastPathComponent(file.path))) === "ipynb"
          ? options.maxNotebookBytes
          : options.maxCodeBytes;
      if (file.size > limit) {
        add(report.skipped, "too big to be written by hand");
        continue;
      }
      if (repos.ignores(file.path)) {
        add(report.skipped, "ignored by git");
        continue;
      }
    }
    if (seen.has(file.path)) continue;
    seen.add(file.path);
    found.push({
      path: file.path,
      kind,
      size: file.size,
      mtime: file.mtime,
      inode: file.inode,
      device: file.device,
    });
  }

  const kept = keepCandidates(found, {
    projectRoots,
    roots: rootPaths,
    code: options.code,
    includeDatasets: options.includeDatasets,
  });
  for (const [reason, count] of Object.entries(kept.skipped)) add(report.skipped, reason, count);
  report.datasets = kept.datasets;
  report.candidates = kept.kept;
  return report;
}

/** The kind a walked file is indexed as, or null after counting why not. */
function indexedKind(file: WalkFile, options: IndexOptions, report: CrawlReport) {
  const facts = { dataless: file.dataless, inCloud: file.inCloud };
  const classification = options.code
    ? classifyCode(file.path, options, facts)
    : classify(file.path, file.type, options, file.screenshotMarker, facts);
  switch (classification.action) {
    case "ignore":
      add(report.skipped, "other type");
      return null;
    case "skip":
      add(report.skipped, classification.reason);
      return null;
    case "index":
      return classification.kind;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Git
// ---------------------------------------------------------------------------------------------------------------------

/**
 * A git that's really installed (Xcode's, the command line tools', Homebrew's): /usr/bin/git on a Mac without the
 * developer tools only asks to install them (DigUp: FileSystem.git).
 */
export function findGit(): string | null {
  const candidates: string[] = [];
  try {
    candidates.push(readlinkSync("/var/db/xcode_select_link") + "/usr/bin/git");
  } catch {
    // no developer tools selected
  }
  candidates.push(
    "/Library/Developer/CommandLineTools/usr/bin/git",
    "/Applications/Xcode.app/Contents/Developer/usr/bin/git",
    "/opt/homebrew/bin/git",
    "/usr/local/bin/git",
  );
  return candidates.find(isExecutableFile) ?? null;
}

function isExecutableFile(path: string): boolean {
  try {
    const info = statSync(path);
    return info.isFile() && (info.mode & 0o111) !== 0;
  } catch {
    return false;
  }
}

const NON_ASCII = /[\u0080-￿]/;
/** Swift's Set<String> matches canonical equivalents: git may spell a name precomposed where the disk has it not. */
const canonical = (path: string) => (NON_ASCII.test(path) ? path.normalize("NFC") : path);

/**
 * The files git keeps in a repo: tracked ones, and new ones its .gitignore doesn't leave out. Paths relative to `repo`
 * (canonical), or null when git can't say (no git, not a repo, an error). Never takes the repo's lock.
 */
export function gitFiles(git: string | null, repo: string): Promise<Set<string> | null> {
  if (!git) return Promise.resolve(null);
  return new Promise((done) => {
    execFile(
      git,
      ["-C", repo, "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
      {
        // Reading only: never wait for, or take, the repo's lock (an editor's git may be busy in it).
        env: { GIT_OPTIONAL_LOCKS: "0", PATH: "/usr/bin:/bin", HOME: homedir() },
        encoding: "buffer",
        maxBuffer: 1 << 30,
      },
      (error, stdout) => {
        if (error) return done(null);
        const decoder = new TextDecoder("utf-8", { fatal: true });
        const kept = new Set<string>();
        let start = 0;
        for (let at = stdout.indexOf(0); at >= 0; start = at + 1, at = stdout.indexOf(0, start)) {
          if (at === start) continue;
          try {
            kept.add(canonical(decoder.decode(stdout.subarray(start, at))));
          } catch {
            // not UTF-8: DigUp drops such a name too
          }
        }
        if (start < stdout.length) {
          try {
            kept.add(canonical(decoder.decode(stdout.subarray(start))));
          } catch {
            // as above
          }
        }
        done(kept);
      },
    );
  });
}

/**
 * The git repos a code crawl walks through, and the files each keeps (DigUp: GitRepos). A folder that isn't in a repo,
 * or a Mac without git, has no list: everything there counts.
 */
export class GitRepos {
  /** Repo folder → the files git keeps in it, or null when git couldn't say. */
  private readonly files = new Map<string, Set<string> | null>();
  /** Folder → the repo it's in (null: none), as the walk found them. */
  private readonly repoOf = new Map<string, string | null>();

  constructor(private readonly git: string | null) {}

  /** A chosen folder: a repo itself, or inside one (a repo's subfolder chosen on its own). */
  async enterRoot(path: string): Promise<void> {
    for (let folder = path; ;) {
      if (existsSync(folder + "/.git")) {
        if (!this.files.has(folder)) this.files.set(folder, await gitFiles(this.git, folder));
        this.repoOf.set(path, folder);
        return;
      }
      const parent = parentPath(folder);
      if (parent === folder || parent.length <= 1) break;
      folder = parent;
    }
    this.repoOf.set(path, null);
  }

  /** A folder the walk went into that has a .git folder: a repo of its own. */
  async enter(path: string): Promise<void> {
    if (!this.files.has(path)) this.files.set(path, await gitFiles(this.git, path));
    this.repoOf.set(path, path);
  }

  /** The repo `folder` is in, from the closest folder the walk has seen. */
  private repo(folder: string): string | null {
    const known = this.repoOf.get(folder);
    if (known !== undefined) return known;
    const parent = parentPath(folder);
    const answer = parent !== folder && parent.length > 1 ? this.repo(parent) : null;
    this.repoOf.set(folder, answer);
    return answer;
  }

  /** Whether git leaves out the file at `path` (in a repo whose files git listed). */
  ignores(path: string): boolean {
    const repo = this.repo(parentPath(path));
    if (repo === null) return false;
    const kept = this.files.get(repo);
    if (!kept) return false;
    return !kept.has(canonical(path.slice(repo.length + 1)));
  }
}
