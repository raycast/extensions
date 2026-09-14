import fs from "node:fs";
import { spawn } from "node:child_process";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { transformSync } from "esbuild";
import { between } from "./source-slice";
import { findFd, FD_DIRECTORIES } from "../src/lib/fd";
import { formatSize } from "../src/lib/format";
import { buildFtsQuery, MIN_INDEX_TERM } from "../src/lib/fts-query";
import type { Erased } from "../src/lib/erase";
import {
  SCHEMA_VERSION,
  IndexRoot,
  countIndexedFiles,
  deleteIndexDatabase,
  ftsSuspended,
  openIndexForRead,
  openIndexForWrite,
  suspendFtsSync,
  readIndexRoots,
  readIndexStats,
  writeLastDuration,
} from "../src/lib/index-db";
import {
  fdArguments,
  normalizeRoots,
  redundantLinks,
  resolveRoots,
  scanRoot,
  describeScan,
  INDEX_EXCLUSIONS,
} from "../src/lib/index-scan";
import { queryIndex } from "../src/lib/db-search";
import {
  BUILT_IN_PATTERNS,
  DEFAULT_PATTERNS,
  DEFAULT_SETTINGS,
  IndexSettings,
  defaultScopes,
  MAX_SCOPES,
  addPattern,
  addScope,
  configuredRoots,
  describeSettings,
  parseSettings,
  removePattern,
  removeScope,
  serializeSettings,
} from "../src/lib/index-settings";
import { googleDriveIndexRoots, rebuildIndex } from "../src/lib/index-build";
import {
  IndexCoverage,
  closeIndexReader,
  describeCoverage,
  isReadyCoverage,
  readIndexCoverage,
  searchIndex,
} from "../src/lib/index-reader";
import { parseQuery } from "../src/lib/query";

type Assert = (ok: boolean, label: string) => void;

/** fd output framing: NUL-delimited, directories with a trailing separator. */
function fdOutput(paths: string[]): AsyncIterable<Buffer> {
  return (async function* () {
    yield Buffer.from(paths.join("\0") + "\0", "utf8");
  })();
}

/** Split one payload across chunk boundaries to exercise the decoder. */
function fdOutputSplit(paths: string[], at: number): AsyncIterable<Buffer> {
  const whole = Buffer.from(paths.join("\0") + "\0", "utf8");
  return (async function* () {
    yield whole.subarray(0, at);
    yield whole.subarray(at);
  })();
}

/**
 * A resolved temporary directory.
 *
 * On macOS os.tmpdir() is `/var/...`, a symlink to `/private/var/...`, and fd
 * canonicalises the root it is given. Resolving here keeps fixture paths equal
 * to what fd emits, so exact-path assertions mean what they say.
 */
function tempDir(label: string): string {
  return fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), `fsbu-${label}-`)),
  );
}

function openWritable(dir: string): DatabaseSync {
  const opened = openIndexForWrite(path.join(dir, "index.sqlite"));
  if (opened.kind !== "opened") throw new Error("could not open test index");
  return opened.db;
}

function rowPaths(db: DatabaseSync): string[] {
  return (
    db.prepare("SELECT path FROM files ORDER BY path").all() as unknown as {
      path: string;
    }[]
  ).map((row) => row.path);
}

export async function indexChecks(assert: Assert) {
  // ---------------------------------------------------------------- fd lookup
  const fakeProbe = (allowed: string[]) => (candidate: string) =>
    allowed.includes(candidate);

  const viaPath = findFd(
    undefined,
    { PATH: "/custom/bin:/other" },
    fakeProbe(["/custom/bin/fd"]),
  );
  assert(
    viaPath.kind === "found" &&
      viaPath.path === "/custom/bin/fd" &&
      viaPath.source === "path",
    "fd is found on PATH",
  );

  const viaKnown = findFd(
    undefined,
    { PATH: "" },
    fakeProbe(["/opt/homebrew/bin/fd"]),
  );
  assert(
    viaKnown.kind === "found" && viaKnown.source === "known",
    "fd is found in the Apple Silicon Homebrew prefix without PATH",
  );
  const intel = findFd(
    undefined,
    { PATH: "" },
    fakeProbe(["/usr/local/bin/fd"]),
  );
  assert(
    intel.kind === "found" && intel.path === "/usr/local/bin/fd",
    "fd is found in the Intel Homebrew prefix",
  );
  assert(
    FD_DIRECTORIES.includes("/opt/homebrew/bin") &&
      FD_DIRECTORIES.includes("/usr/local/bin"),
    "both Homebrew prefixes are probed",
  );

  const preferred = findFd(
    "/somewhere/custom/fd",
    { PATH: "" },
    fakeProbe(["/somewhere/custom/fd", "/opt/homebrew/bin/fd"]),
  );
  assert(
    preferred.kind === "found" && preferred.source === "preference",
    "an explicit preference wins over a discovered fd",
  );
  const badPreference = findFd(
    "/nope/fd",
    { PATH: "" },
    fakeProbe(["/opt/homebrew/bin/fd"]),
  );
  assert(
    badPreference.kind === "unusable",
    "a preference that does not resolve is reported rather than silently replaced",
  );
  assert(
    findFd("relative/fd", { PATH: "" }, () => true).kind === "unusable",
    "a relative fd preference is rejected",
  );
  const missing = findFd(undefined, { PATH: "" }, () => false);
  assert(
    missing.kind === "missing" &&
      /brew install fd/u.test(missing.reason) === false,
    "a missing fd reports the reason without assuming the install method",
  );
  assert(
    findFd(undefined, { PATH: "relative:/abs" }, fakeProbe(["/abs/fd"]))
      .kind === "found",
    "relative PATH entries are skipped",
  );

  // ------------------------------------------------------------- FTS building
  const simple = buildFtsQuery(["annual"]);
  assert(simple.match === '"annual"*', "a single term becomes a quoted prefix");
  assert(
    buildFtsQuery(["annual", "ledger"]).match === '"annual"* AND "ledger"*',
    "multiple terms are ANDed as independent prefixes",
  );
  assert(
    buildFtsQuery(['a"quote']).match === '"a""quote"*',
    "an embedded double quote is doubled, not escaped away",
  );
  for (const operator of ["AND", "OR", "NOT", "NEAR"])
    assert(
      buildFtsQuery([operator], 1).match === `"${operator}"*`,
      `the FTS operator ${operator} is quoted as literal text`,
    );
  assert(
    buildFtsQuery(["OR"]).match === undefined,
    "a two-character operator is also below the length policy",
  );
  assert(
    buildFtsQuery(["name:x"]).match === '"name:x"*',
    "a colon is data, not a column filter",
  );
  assert(
    buildFtsQuery(["(a)b"]).match === '"(a)b"*',
    "parentheses are data, not grouping",
  );
  assert(
    buildFtsQuery(["a*b"]).match === '"a*b"*',
    "an embedded star is data, not an operator",
  );
  assert(
    buildFtsQuery(["---"]).match === undefined &&
      buildFtsQuery(["---"]).tooShort === false,
    "a punctuation-only term is dropped rather than ANDed into nothing",
  );
  assert(
    buildFtsQuery(["foo", "---"]).match === '"foo"*',
    "a punctuation-only term does not empty an otherwise good query",
  );
  assert(buildFtsQuery([]).match === undefined, "no terms produce no query");
  const short = buildFtsQuery(["ab"]);
  assert(
    short.match === undefined && short.tooShort,
    "a two-character term is reported as too short, not searched",
  );
  assert(
    buildFtsQuery(["ab"], 2).match === '"ab"*',
    "the minimum length is a policy the caller can set",
  );
  assert(MIN_INDEX_TERM === 3, "indexed search begins at three characters");
  assert(
    buildFtsQuery(["café"]).match === '"café"*',
    "diacritics are passed through for the tokenizer to fold",
  );

  // ------------------------------------------------------------------- schema
  const schemaDir = tempDir("schema");
  const schemaFile = path.join(schemaDir, "index.sqlite");
  const created = openIndexForWrite(schemaFile);
  assert(created.kind === "opened", "a new index file is created");
  if (created.kind === "opened") {
    const version = created.db.prepare("PRAGMA user_version").get() as {
      user_version: number;
    };
    assert(
      Number(version.user_version) === SCHEMA_VERSION,
      "the schema version is recorded",
    );
    const mode = created.db.prepare("PRAGMA journal_mode").get() as {
      journal_mode: string;
    };
    assert(
      mode.journal_mode === "wal",
      "WAL is enabled so a search can read during a rebuild",
    );
    created.db.close();
  }
  assert(
    openIndexForRead(schemaFile).kind === "opened",
    "an existing index opens read-only",
  );
  assert(
    openIndexForRead(path.join(schemaDir, "absent.sqlite")).kind === "missing",
    "a missing index is reported as missing, not as a failure",
  );

  // A file that is not a database is replaced rather than reported forever.
  const corruptFile = path.join(schemaDir, "corrupt.sqlite");
  fs.writeFileSync(corruptFile, "this is definitely not sqlite");
  const recovered = openIndexForWrite(corruptFile);
  assert(
    recovered.kind === "opened",
    "a corrupt index file is discarded and recreated",
  );
  if (recovered.kind === "opened") recovered.db.close();
  assert(
    openIndexForRead(corruptFile).kind === "opened",
    "the recreated file is usable",
  );

  // An older schema is rebuilt rather than queried with the wrong shape.
  const staleFile = path.join(schemaDir, "stale.sqlite");
  const stale = new DatabaseSync(staleFile);
  stale.exec("PRAGMA user_version = 999");
  stale.exec("CREATE TABLE leftover(x)");
  stale.close();
  const upgraded = openIndexForWrite(staleFile);
  assert(upgraded.kind === "opened", "an unknown schema version is rebuilt");
  if (upgraded.kind === "opened") {
    const leftover = upgraded.db
      .prepare("SELECT name FROM sqlite_master WHERE name = 'leftover'")
      .all();
    assert(leftover.length === 0, "the rebuilt file drops the old schema");
    upgraded.db.close();
  }
  assert(
    openIndexForRead(staleFile).kind === "opened",
    "a rebuilt file reports the current version",
  );

  // ----------------------------------------------------------- index settings
  assert(
    parseSettings(undefined).includeDrive &&
      parseSettings(undefined).scopes.join("|") ===
        DEFAULT_SETTINGS.scopes.join("|") &&
      parseSettings(undefined).patterns.join("|") ===
        DEFAULT_SETTINGS.patterns.join("|"),
    "absent settings mean the defaults",
  );
  assert(
    defaultScopes("/Users/example").join("|") === "/Users/example",
    "the default scope is the home folder",
  );
  assert(
    !defaultScopes("/Users/example").includes("/Applications"),
    "/Applications is not indexed: Raycast opens applications already, and the bundles dwarf everything else",
  );
  assert(
    DEFAULT_SETTINGS.scopes.every((scope) => scope.startsWith("/")) &&
      !DEFAULT_SETTINGS.scopes.some((scope) => scope.includes("example")),
    "the home scope is derived at run time rather than written down",
  );
  assert(
    DEFAULT_PATTERNS.includes("**/[Cc]ache/**") &&
      DEFAULT_PATTERNS.includes("**/Library/Application Support/**") &&
      DEFAULT_PATTERNS.includes("**/Library/Containers/**") &&
      DEFAULT_PATTERNS.includes("**/Library/Daemon Containers/**"),
    "the default ignore patterns cover scratch files, caches and app sandboxes",
  );
  assert(
    !DEFAULT_PATTERNS.some((pattern) =>
      pattern.includes('Mobile Documents/**"'),
    ) && !DEFAULT_PATTERNS.includes("**/Library/**"),
    "iCloud Drive is not excluded: only the parts of Library that hold app state",
  );
  assert(
    !DEFAULT_SETTINGS.includeHidden,
    "hidden files are off by default, which is what keeps the scan under 30 seconds",
  );
  assert(
    DEFAULT_PATTERNS.every(
      (pattern) => addPattern(DEFAULT_SETTINGS, pattern).kind === "duplicate",
    ),
    "no default pattern can be added a second time",
  );
  assert(
    parseSettings("not json").includeDrive,
    "unparseable settings fall back to the defaults instead of throwing",
  );
  assert(
    parseSettings("[1,2,3]").includeDrive && parseSettings("null").includeDrive,
    "a value of the wrong shape falls back too",
  );
  const partialSaved = parseSettings(
    JSON.stringify({ scopes: ["/a"], includeDrive: false }),
  );
  assert(
    partialSaved.scopes.join(",") === "/a" &&
      !partialSaved.includeDrive &&
      partialSaved.includeHidden === DEFAULT_SETTINGS.includeHidden,
    "missing fields take their individual defaults",
  );
  const dirty = parseSettings(
    JSON.stringify({
      scopes: ["/a", "  /b  ", "/a", "", 7, null],
      patterns: ["*.tmp", "*.tmp", " "],
    }),
  );
  assert(
    dirty.scopes.join(",") === "/a,/b" && dirty.patterns.join(",") === "*.tmp",
    "stored lists are trimmed and deduplicated, and non-strings dropped",
  );
  assert(
    parseSettings(serializeSettings(dirty)).scopes.join(",") === "/a,/b",
    "settings survive a round trip",
  );

  // The defaults are no longer empty, so editing rules are checked against a
  // blank baseline and the defaults get assertions of their own below.
  const empty: IndexSettings = {
    ...DEFAULT_SETTINGS,
    scopes: [],
    patterns: [],
  };
  const oneScope = addScope(empty, "/Users/example/Notes/");
  assert(
    oneScope.kind === "added" &&
      oneScope.settings.scopes.join(",") === "/Users/example/Notes",
    "a trailing separator is dropped when a scope is added",
  );
  assert(
    addScope(empty, "relative/path").kind === "invalid",
    "a relative scope is rejected, because fd resolves the root itself",
  );
  assert(
    addScope(empty, "   ").kind === "invalid",
    "an empty scope is rejected",
  );
  assert(
    oneScope.kind === "added" &&
      addScope(oneScope.settings, "/Users/example/Notes").kind === "duplicate",
    "the same scope cannot be added twice",
  );
  let filling = empty;
  for (let i = 0; i < MAX_SCOPES; i++) {
    const added = addScope(filling, `/scope/${i}`);
    if (added.kind === "added") filling = added.settings;
  }
  assert(
    addScope(filling, "/one/too/many").kind === "full",
    "the scope list is bounded",
  );
  assert(
    removeScope(filling, "/scope/0").scopes.length === MAX_SCOPES - 1,
    "removing a scope drops exactly that one",
  );

  const onePattern = addPattern(empty, "  *.bak  ");
  assert(
    onePattern.kind === "added" &&
      onePattern.settings.patterns.join(",") === "*.bak",
    "a pattern is trimmed when added",
  );
  assert(
    addPattern(empty, BUILT_IN_PATTERNS[0]).kind === "duplicate",
    "a pattern that is already built in is not added again",
  );
  assert(
    addPattern(empty, "").kind === "invalid",
    "an empty pattern is rejected",
  );
  assert(
    onePattern.kind === "added" &&
      removePattern(onePattern.settings, "*.bak").patterns.length === 0,
    "removing a pattern drops it",
  );

  assert(
    configuredRoots(empty, ["/Drive/A"]).join(",") === "/Drive/A",
    "with no extra scopes the roots are the detected drives",
  );
  assert(
    configuredRoots(DEFAULT_SETTINGS, ["/Drive/A"])[0] === "/Drive/A" &&
      configuredRoots(DEFAULT_SETTINGS, ["/Drive/A"]).length === 2,
    "the defaults scan the detected drives plus the home folder",
  );
  assert(
    configuredRoots({ ...DEFAULT_SETTINGS, scopes: ["/extra"] }, [
      "/Drive/A",
    ]).join(",") === "/Drive/A,/extra",
    "detected drives come before configured scopes",
  );
  assert(
    configuredRoots(
      { ...DEFAULT_SETTINGS, includeDrive: false, scopes: ["/extra"] },
      ["/Drive/A"],
    ).join(",") === "/extra",
    "turning Google Drive off leaves only the configured scopes",
  );
  assert(
    configuredRoots({ ...DEFAULT_SETTINGS, scopes: ["/Drive/A"] }, [
      "/Drive/A",
    ]).join(",") === "/Drive/A",
    "a scope that repeats a detected drive is not indexed twice",
  );
  assert(
    configuredRoots({ ...empty, includeDrive: false }, ["/Drive/A"]).length ===
      0,
    "with nothing configured there is nothing to scan, which the caller reports",
  );
  assert(
    describeSettings(empty) === "Google Drive" &&
      describeSettings({ ...empty, scopes: ["/a"] }).includes(
        "1 extra folder",
      ) &&
      describeSettings({ ...empty, includeDrive: false }) ===
        "Nothing to index",
    "the settings summary names what will be indexed",
  );

  // -------------------------------------------- redundant symlink detection
  const dupDir = tempDir("dupLinks");
  const dupTarget = path.join(dupDir, "cloud", "inner");
  fs.mkdirSync(dupTarget, { recursive: true });
  fs.writeFileSync(path.join(dupTarget, "doc.txt"), "d");
  const dupOutside = tempDir("dupOutside");
  fs.writeFileSync(path.join(dupOutside, "elsewhere.txt"), "e");
  // A link to somewhere already inside this root, the case that doubles a scan.
  fs.symlinkSync(path.join(dupDir, "cloud"), path.join(dupDir, "Cloud Link"));
  // A link out of the root: following it is the only way to reach those files.
  fs.symlinkSync(dupOutside, path.join(dupDir, "Outside Link"));
  // A link to nothing.
  fs.symlinkSync(path.join(dupDir, "absent"), path.join(dupDir, "Broken"));
  fs.mkdirSync(path.join(dupDir, "cloud", "inner", "Cloud Link"), {
    recursive: true,
  });

  const dupLinks = await redundantLinks(dupDir, [dupDir]);
  assert(
    dupLinks.join("|") === "/cloud",
    `a link inside the root wins and its target is excluded (${dupLinks.join("|") || "none"})`,
  );
  assert(
    dupLinks.every((name) => name.startsWith("/")),
    "the exclusions are anchored, so a deeper entry of the same name survives",
  );
  assert(
    (await redundantLinks(dupDir, [dupDir, dupOutside])).join("|") ===
      "/cloud|/Outside Link",
    "a link into another root is itself excluded, since that root's scan owns those files",
  );
  assert(
    (await redundantLinks(path.join(dupDir, "absent"), [dupDir])).length === 0,
    "an unreadable root yields no exclusions rather than failing",
  );

  // The whole point: the same files are not emitted twice.
  const dupFd = findFd();
  if (dupFd.kind === "found") {
    const dupWalk = (patterns: readonly string[]) =>
      new Promise<string[]>((resolve) => {
        const out: string[] = [];
        let buffered = "";
        const proc = spawn(dupFd.path, fdArguments(dupDir, { patterns }), {
          stdio: ["ignore", "pipe", "ignore"],
        });
        proc.stdout.setEncoding("utf8");
        proc.stdout.on("data", (chunk: string) => {
          buffered += chunk;
          let at;
          while ((at = buffered.indexOf("\0")) >= 0) {
            out.push(buffered.slice(0, at));
            buffered = buffered.slice(at + 1);
          }
        });
        proc.on("close", () => resolve(out));
      });
    const dupDoubled = await dupWalk([]);
    const dupDeduped = await dupWalk(dupLinks);
    const dupDocs = (paths: string[]) =>
      paths.filter((full) => full.endsWith("doc.txt")).length;
    assert(
      dupDocs(dupDoubled) === 2,
      `without the exclusion the file is emitted under both spellings (${dupDocs(dupDoubled)})`,
    );
    assert(
      dupDocs(dupDeduped) === 1,
      `with it the file is emitted once (${dupDocs(dupDeduped)})`,
    );
    assert(
      dupDeduped.some((full) => full.includes("Cloud Link/inner")),
      "the surviving copy is the one under the link the user made",
    );
    assert(
      !dupDeduped.some((full) => /\/cloud\/inner/u.test(full)),
      "the machinery path it points at is the copy that goes",
    );
    assert(
      dupDeduped.some((full) => full.includes("Outside Link")),
      "a link reaching outside every root is still followed",
    );
  }
  fs.rmSync(dupDir, { recursive: true, force: true });
  fs.rmSync(dupOutside, { recursive: true, force: true });

  // ------------------------------------------------------------ fd invocation
  const args = fdArguments("/some/root");
  assert(
    args.includes("--print0") &&
      args.includes("--hidden") &&
      args.includes("--follow") &&
      args.includes("--no-ignore") &&
      args.includes("--absolute-path"),
    "fd is asked for absolute, NUL-delimited, hidden, symlink-following output",
  );
  assert(
    args[args.length - 1] === "/some/root" && args[args.length - 2] === ".",
    "the root is the search path and the pattern matches everything",
  );
  for (const exclusion of INDEX_EXCLUSIONS)
    assert(
      args.some(
        (arg, index) => arg === "--exclude" && args[index + 1] === exclusion,
      ),
      `fd excludes ${exclusion}`,
    );
  assert(
    !fdArguments("/root", false).includes("--hidden"),
    "hidden entries can be left out",
  );
  assert(
    args.every((arg) => !arg.includes("&&") && !arg.includes(";")),
    "arguments are passed as an array, so no shell metacharacters are assembled",
  );

  // User patterns and the ignore-files toggle from the settings.
  const withPatterns = fdArguments("/root", {
    patterns: ["*.tmp", "**/[Cc]ache/**"],
  });
  for (const pattern of ["*.tmp", "**/[Cc]ache/**"])
    assert(
      withPatterns.some(
        (arg, index) =>
          arg === "--exclude" && withPatterns[index + 1] === pattern,
      ),
      `a configured pattern reaches fd verbatim (${pattern})`,
    );
  assert(
    INDEX_EXCLUSIONS.every((exclusion) =>
      withPatterns.some(
        (arg, index) =>
          arg === "--exclude" && withPatterns[index + 1] === exclusion,
      ),
    ),
    "configured patterns add to the built-in exclusions rather than replacing them",
  );
  const ignoring = fdArguments("/root", { useIgnoreFiles: true });
  assert(
    !ignoring.includes("--no-ignore") && ignoring.includes("--no-require-git"),
    "using ignore files drops --no-ignore and stops fd requiring a git repository",
  );
  assert(
    fdArguments("/root", { useIgnoreFiles: false }).includes("--no-ignore"),
    "the default still indexes files git would ignore",
  );
  assert(
    fdArguments("/root", true).includes("--hidden") &&
      !fdArguments("/root", false).includes("--hidden"),
    "the boolean form still means showHidden",
  );

  // --------------------------------------------------------------- scan basics
  const scanDir = tempDir("scan");
  const root = path.join(scanDir, "root");
  fs.mkdirSync(path.join(root, "sub"), { recursive: true });
  const oddName = 'we"ird\tname with spaces.txt';
  fs.writeFileSync(path.join(root, "alpha.txt"), "a");
  fs.writeFileSync(path.join(root, oddName), "b");
  fs.writeFileSync(path.join(root, "sub", "beta.md"), "cc");
  const scanDb = openWritable(scanDir);
  const observed = [
    `${root}/alpha.txt`,
    `${root}/${oddName}`,
    `${root}/sub/`,
    `${root}/sub/beta.md`,
  ];
  const first = await scanRoot(
    root,
    {
      fd: "/unused",
      roots: [root],
      db: scanDb,
      spawnFd: () => fdOutput(observed),
    },
    Date.now() + 60_000,
  );
  assert(
    first.complete,
    "a scan that reaches the end of fd's output is complete",
  );
  assert(
    first.scanned === 4 && first.indexed === 4,
    `scanned and indexed counts are reported (${first.scanned}/${first.indexed})`,
  );
  assert(
    rowPaths(scanDb).includes(path.join(root, oddName)),
    "a filename with quotes, tabs and spaces round-trips through NUL framing",
  );
  const dirRow = scanDb
    .prepare("SELECT is_dir FROM files WHERE path = ?")
    .get(path.join(root, "sub")) as { is_dir: number };
  assert(
    dirRow.is_dir === 1,
    "fd's trailing separator marks a directory and the separator is stripped",
  );
  const sizeRow = scanDb
    .prepare("SELECT size, mtime_ms FROM files WHERE path = ?")
    .get(path.join(root, "sub", "beta.md")) as {
    size: number;
    mtime_ms: number;
  };
  assert(
    sizeRow.size === 2 && sizeRow.mtime_ms > 0,
    "size and modification time are collected during indexing",
  );

  // Chunk boundaries must not split a path.
  const splitDb = openWritable(tempDir("split"));
  const splitResult = await scanRoot(
    root,
    {
      fd: "/unused",
      roots: [root],
      db: splitDb,
      spawnFd: () => fdOutputSplit(observed, 12),
    },
    Date.now() + 60_000,
  );
  assert(
    splitResult.indexed === 4 &&
      rowPaths(splitDb).includes(path.join(root, oddName)),
    "a path split across two chunks is reassembled",
  );
  splitDb.close();

  // ----------------------------------------------------- refresh semantics
  // A complete rescan that no longer sees a path removes it.
  const second = await scanRoot(
    root,
    {
      fd: "/unused",
      roots: [root],
      db: scanDb,
      spawnFd: () => fdOutput([`${root}/alpha.txt`]),
    },
    Date.now() + 60_000,
  );
  assert(
    second.complete && rowPaths(scanDb).length === 1,
    "a complete scan removes paths it no longer sees",
  );

  // A partial scan must not delete anything.
  const partial = await scanRoot(
    root,
    {
      fd: "/unused",
      roots: [root],
      db: scanDb,
      maxEntries: 1,
      spawnFd: () => fdOutput([`${root}/gamma.txt`, `${root}/delta.txt`]),
    },
    Date.now() + 60_000,
  );
  assert(
    !partial.complete && partial.stopped === "item-limit",
    "an item limit is reported as an incomplete scan",
  );
  assert(
    rowPaths(scanDb).includes(path.join(root, "alpha.txt")),
    "a partial scan merges and keeps previously indexed paths",
  );
  const partialRoot = readIndexRoots(scanDb).find(
    (entry) => entry.root === root,
  );
  assert(
    partialRoot !== undefined &&
      partialRoot.complete === 0 &&
      partialRoot.note !== null &&
      /item limit/u.test(partialRoot.note),
    "an incomplete root records why it stopped",
  );

  // A scan that fails mid-stream must not delete anything either.
  const beforeFailure = rowPaths(scanDb).length;
  const failed = await scanRoot(
    root,
    {
      fd: "/unused",
      roots: [root],
      db: scanDb,
      spawnFd: () =>
        (async function* () {
          yield Buffer.from(`${root}/kept.txt\0`, "utf8");
          throw new Error("fd exploded");
        })(),
    },
    Date.now() + 60_000,
  );
  assert(
    !failed.complete && failed.error !== undefined,
    "a failed scan reports the error and is not complete",
  );
  assert(
    rowPaths(scanDb).length >= beforeFailure,
    "a failed scan never removes saved coverage",
  );

  // Cancellation is an incomplete scan, not a failure.
  const aborter = new AbortController();
  const cancelled = await scanRoot(
    root,
    {
      fd: "/unused",
      roots: [root],
      db: scanDb,
      signal: aborter.signal,
      spawnFd: () =>
        (async function* () {
          yield Buffer.from(`${root}/one.txt\0`, "utf8");
          aborter.abort();
          yield Buffer.from(`${root}/two.txt\0`, "utf8");
        })(),
    },
    Date.now() + 60_000,
  );
  assert(!cancelled.complete, "a cancelled scan is incomplete");
  assert(
    rowPaths(scanDb).some((p) => p.endsWith("alpha.txt")),
    "a cancelled scan keeps saved coverage",
  );

  // A time limit is reported distinctly from an item limit.
  const timedDb = openWritable(tempDir("timed"));
  const timed = await scanRoot(
    root,
    {
      fd: "/unused",
      roots: [root],
      db: timedDb,
      spawnFd: () =>
        (async function* () {
          for (let i = 0; i < 2500; i++)
            yield Buffer.from(`${root}/f${i}.txt\0`, "utf8");
        })(),
    },
    Date.now() - 1,
  );
  assert(
    timed.stopped === "time-limit" && !timed.complete,
    "an exhausted time budget stops the scan and reports the reason",
  );
  timedDb.close();

  // A root that is gone leaves its saved coverage alone.
  const missingRoot = path.join(scanDir, "never-existed");
  const rootsBeforeVanish = readIndexRoots(scanDb).length;
  const vanished = await scanRoot(
    missingRoot,
    { fd: "/unused", roots: [], db: scanDb, spawnFd: () => fdOutput([]) },
    Date.now() + 60_000,
  );
  assert(
    !vanished.complete && vanished.error !== undefined,
    "an unavailable root is reported as unavailable",
  );
  assert(
    readIndexRoots(scanDb).length === rootsBeforeVanish &&
      !readIndexRoots(scanDb).some((entry) => entry.root === missingRoot),
    "an unavailable root writes nothing, so earlier coverage is not overwritten",
  );

  // A root that was complete and is now unavailable keeps its good record.
  const unmountable = path.join(scanDir, "unmountable");
  fs.mkdirSync(unmountable, { recursive: true });
  fs.writeFileSync(path.join(unmountable, "present.txt"), "p");
  await scanRoot(
    unmountable,
    {
      fd: "/unused",
      roots: [unmountable],
      db: scanDb,
      spawnFd: () => fdOutput([`${unmountable}/present.txt`]),
    },
    Date.now() + 60_000,
  );
  fs.rmSync(unmountable, { recursive: true, force: true });
  const afterUnmount = await scanRoot(
    unmountable,
    {
      fd: "/unused",
      roots: [unmountable],
      db: scanDb,
      spawnFd: () => fdOutput([]),
    },
    Date.now() + 60_000,
  );
  const keptRecord = readIndexRoots(scanDb).find(
    (entry) => entry.root === unmountable,
  );
  assert(
    afterUnmount.error !== undefined && keptRecord?.complete === 1,
    "a root that disappears keeps the record from when it was readable",
  );
  assert(
    rowPaths(scanDb).some((p) => p.startsWith(unmountable)),
    "a disappeared root keeps its indexed rows rather than dropping coverage",
  );

  // Scope isolation: a complete scan of one root cannot remove another's rows.
  const otherRoot = path.join(scanDir, "other");
  fs.mkdirSync(otherRoot, { recursive: true });
  fs.writeFileSync(path.join(otherRoot, "other.txt"), "x");
  await scanRoot(
    otherRoot,
    {
      fd: "/unused",
      roots: [otherRoot],
      db: scanDb,
      spawnFd: () => fdOutput([`${otherRoot}/other.txt`]),
    },
    Date.now() + 60_000,
  );
  const bothRoots = rowPaths(scanDb);
  await scanRoot(
    root,
    {
      fd: "/unused",
      roots: [root],
      db: scanDb,
      spawnFd: () => fdOutput([`${root}/alpha.txt`]),
    },
    Date.now() + 60_000,
  );
  assert(
    bothRoots.some((p) => p.startsWith(otherRoot)) &&
      rowPaths(scanDb).some((p) => p.startsWith(otherRoot)),
    "a complete scan of one root leaves another root's rows in place",
  );
  const roots = readIndexRoots(scanDb);
  assert(
    roots.length === 3 && roots.every((entry) => entry.scannedAt > 0),
    `each readable root is recorded with its outcome (${roots.length})`,
  );
  assert(
    roots.filter((entry) => entry.complete === 1).length === 3,
    "a completed rescan clears the earlier incomplete note",
  );

  assert(
    normalizeRoots(["/a", "/a/b", "/c"]).join(",") === "/a,/c",
    "a root inside another is dropped so stale removal stays scope-safe",
  );
  assert(
    normalizeRoots(["/a/", "/a"]).length === 1,
    "duplicate roots collapse",
  );
  assert(
    normalizeRoots(["/ab", "/a"]).sort().join(",") === "/a,/ab",
    "a shared name prefix is not treated as containment",
  );

  // fd resolves the root it is given, so two spellings must collapse to one.
  const linkDir = tempDir("rootlink");
  const realTarget = path.join(linkDir, "target");
  fs.mkdirSync(realTarget, { recursive: true });
  fs.symlinkSync(realTarget, path.join(linkDir, "alias"));
  const resolved = await resolveRoots([
    path.join(linkDir, "alias"),
    realTarget,
  ]);
  assert(
    resolved.length === 1 && resolved[0] === realTarget,
    "a symlinked root and its target collapse to one canonical root",
  );
  assert(
    (await resolveRoots([path.join(linkDir, "absent")]))[0] ===
      path.join(linkDir, "absent"),
    "an unresolvable root is kept so the scan can report it unavailable",
  );
  fs.rmSync(linkDir, { recursive: true, force: true });

  // ------------------------------------------------------------------- search
  const searchDir = tempDir("search");
  const searchDb = openWritable(searchDir);
  const now = Date.now();
  const insert = searchDb.prepare(
    `INSERT INTO files (path,name,parent,root,is_dir,is_symlink,size,mtime_ms,birthtime_ms,storage_path,scan_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,1)`,
  );
  const add = (
    full: string,
    opts: { dir?: boolean; size?: number; age?: number; link?: string } = {},
  ) =>
    insert.run(
      full,
      path.basename(full),
      path.dirname(full),
      "/idx",
      opts.dir ? 1 : 0,
      opts.link ? 1 : 0,
      opts.size ?? 10,
      now - (opts.age ?? 0),
      now - (opts.age ?? 0),
      opts.link ?? null,
    );
  const DAY = 86_400_000;
  add("/idx/Annual Ledger Summary.pdf", { size: 2048 });
  add("/idx/annual notes.md", { age: 400 * DAY });
  add("/idx/ledger draft.docx", { size: 50 });
  add("/idx/Projects", { dir: true });
  add("/idx/Projects/report-2026 final.xlsx", { size: 900_000 });
  add("/idx/.hidden-notes.txt");
  add("/idx/archive.tar.gz");
  add("/idx/naïve café.md");
  add("/idx/link-to-summary.pdf", { link: "/idx/Annual Ledger Summary.pdf" });

  const names = (parsed: ReturnType<typeof parseQuery>, showHidden = false) =>
    queryIndex(searchDb, parsed, { showHidden })
      .entries.map((entry) => entry.name)
      .sort();

  assert(
    names(parseQuery("annual")).join("|") ===
      "Annual Ledger Summary.pdf|annual notes.md",
    "a prefix matches case-insensitively",
  );
  assert(
    names(parseQuery("annual ledger")).join("|") ===
      "Annual Ledger Summary.pdf",
    "two terms require both prefixes in the filename",
  );
  assert(
    names(parseQuery("ledger annual")).join("|") ===
      "Annual Ledger Summary.pdf",
    "term order in the query does not change which names match",
  );
  assert(
    names(parseQuery("report-2026")).join("|") === "report-2026 final.xlsx",
    "a hyphenated term matches the hyphenated name",
  );
  assert(
    names(parseQuery("naive")).join("|") === "naïve café.md",
    "diacritics are folded by the tokenizer",
  );
  assert(names(parseQuery("zzqq")).length === 0, "a non-match returns nothing");
  assert(
    queryIndex(searchDb, parseQuery("ab")).tooShort,
    "a two-character query is reported too short rather than run",
  );
  assert(
    queryIndex(searchDb, parseQuery("ab")).entries.length === 0,
    "a too-short query returns no indexed rows",
  );

  assert(
    !names(parseQuery("hidden")).includes(".hidden-notes.txt"),
    "hidden entries are excluded by default",
  );
  assert(
    names(parseQuery("hidden"), true).includes(".hidden-notes.txt"),
    "hidden entries appear when they are requested",
  );

  assert(
    names(parseQuery("annual -d")).length === 0 &&
      names(parseQuery("projects -d")).join("|") === "Projects",
    "the folders-only directive is applied in SQL",
  );
  assert(
    !names(parseQuery("projects -f")).includes("Projects"),
    "the files-only directive excludes folders",
  );
  assert(
    names(parseQuery("ledger ext:pdf")).join("|") ===
      "Annual Ledger Summary.pdf",
    "an extension filter is applied in SQL",
  );
  assert(
    names(parseQuery("archive ext:tar.gz")).join("|") === "archive.tar.gz",
    "a compound extension is matched as a suffix",
  );
  assert(
    names(parseQuery("archive ext:GZ")).join("|") === "archive.tar.gz",
    "extension matching is case-insensitive",
  );
  assert(
    names(parseQuery("annual size:>1000")).join("|") ===
      "Annual Ledger Summary.pdf",
    "a minimum size filter is applied in SQL",
  );
  assert(
    names(parseQuery("ledger size:<100")).join("|") === "ledger draft.docx",
    "a maximum size filter is applied in SQL",
  );
  assert(
    !names(parseQuery("projects size:>1")).includes("Projects"),
    "a size bound excludes folders outright",
  );
  const recent = names(
    parseQuery(
      `annual after:${new Date(now - 30 * DAY).toISOString().slice(0, 10)}`,
    ),
  );
  assert(
    recent.join("|") === "Annual Ledger Summary.pdf",
    "a date lower bound is applied in SQL",
  );
  assert(
    names(parseQuery("annual before:2000")).length === 0,
    "a date upper bound is applied in SQL",
  );

  const symlinkRow = queryIndex(searchDb, parseQuery("link-to-summary"))
    .entries[0];
  assert(
    symlinkRow?.isSymlink === true &&
      symlinkRow.storagePath === "/idx/Annual Ledger Summary.pdf",
    "a visible link path is returned with its resolved target for history",
  );

  // Truncation is reported rather than silently capping.
  for (let i = 0; i < 12; i++) add(`/idx/bulk-${i}.txt`);
  const capped = queryIndex(searchDb, parseQuery("bulk"), { limit: 5 });
  assert(
    capped.entries.length === 5 && capped.truncated,
    "the candidate limit is enforced and reported",
  );
  const exact = queryIndex(searchDb, parseQuery("bulk"), { limit: 12 });
  assert(
    exact.entries.length === 12 && !exact.truncated,
    "a result set exactly at the limit is not called truncated",
  );

  // Injection attempts are data.
  for (const hostile of [
    'foo" OR name:"',
    "foo* AND name:x",
    "foo NEAR bar",
    'a"" OR ""b',
    "foo)",
  ]) {
    const result = queryIndex(searchDb, parseQuery(hostile));
    assert(
      result.error === undefined,
      `a hostile query is data, not syntax: ${JSON.stringify(hostile)}`,
    );
  }
  assert(
    queryIndex(searchDb, parseQuery("---")).entries.length === 0 &&
      queryIndex(searchDb, parseQuery("---")).error === undefined,
    "a punctuation-only query returns nothing without an error",
  );

  // ------------------------------------- searches keep working during a refresh
  const liveDir = tempDir("live");
  const liveFile = path.join(liveDir, "index.sqlite");
  const writer = openIndexForWrite(liveFile);
  if (writer.kind === "opened") {
    writer.db
      .prepare(
        `INSERT INTO files (path,name,parent,root,is_dir,is_symlink,size,mtime_ms,birthtime_ms,storage_path,scan_id)
         VALUES ('/live/alpha.txt','alpha.txt','/live','/live',0,0,1,1,1,NULL,1)`,
      )
      .run();
    const readerOpen = openIndexForRead(liveFile);
    assert(readerOpen.kind === "opened", "a reader opens alongside the writer");
    if (readerOpen.kind === "opened") {
      writer.db.exec("BEGIN IMMEDIATE");
      writer.db
        .prepare(
          `INSERT INTO files (path,name,parent,root,is_dir,is_symlink,size,mtime_ms,birthtime_ms,storage_path,scan_id)
           VALUES ('/live/beta.txt','beta.txt','/live','/live',0,0,1,1,1,NULL,2)`,
        )
        .run();
      const during = queryIndex(readerOpen.db, parseQuery("alpha"));
      assert(
        during.entries.length === 1 && during.error === undefined,
        "a search returns results while a rebuild holds a write transaction",
      );
      writer.db.exec("COMMIT");
      const after = queryIndex(readerOpen.db, parseQuery("beta"));
      assert(
        after.entries.length === 1,
        "committed rows become visible to the existing reader",
      );
      readerOpen.db.close();
    }
    writer.db.close();
  }

  // ---------------------------------------------- settings reach a real scan
  const wiredDir = tempDir("wired");
  const wiredFile = path.join(wiredDir, "index.sqlite");
  const wiredScope = path.join(wiredDir, "notes");
  fs.mkdirSync(wiredScope);
  const seenArgs: string[][] = [];
  const wired = await rebuildIndex({
    file: wiredFile,
    withLock: async <T>(work: (owned: () => void) => Promise<T>) =>
      work(() => {}),
    lookupFd: () => ({ kind: "found", path: "/unused", source: "known" }),
    loadSettings: async () => ({
      scopes: [wiredScope],
      patterns: ["*.bak", "**/[Cc]ache/**"],
      includeDrive: false,
      includeHidden: false,
      useIgnoreFiles: true,
    }),
    spawnFd: (args) => {
      seenArgs.push(args);
      return fdOutput([path.join(wiredScope, "kept.txt")]);
    },
  });
  assert(
    wired.kind === "done",
    "a scan runs from the configured scopes with Google Drive off",
  );
  assert(
    seenArgs.length === 1 && seenArgs[0].at(-1) === wiredScope,
    "the configured scope is the root fd is given",
  );
  assert(
    ["*.bak", "**/[Cc]ache/**"].every((pattern) =>
      seenArgs[0].some(
        (arg, index) =>
          arg === "--exclude" && seenArgs[0][index + 1] === pattern,
      ),
    ),
    "configured patterns reach the real fd invocation",
  );
  assert(
    !seenArgs[0].includes("--hidden"),
    "turning hidden files off in settings reaches fd",
  );
  assert(
    !seenArgs[0].includes("--no-ignore"),
    "turning ignore files on in settings reaches fd",
  );

  const nothingConfigured = await rebuildIndex({
    file: wiredFile,
    withLock: async <T>(work: (owned: () => void) => Promise<T>) =>
      work(() => {}),
    lookupFd: () => ({ kind: "found", path: "/unused", source: "known" }),
    loadSettings: async () => ({
      scopes: [],
      patterns: [],
      includeDrive: false,
      includeHidden: true,
      useIgnoreFiles: false,
    }),
  });
  assert(
    nothingConfigured.kind === "no-roots" &&
      nothingConfigured.message.includes("Search Index Settings"),
    "with nothing configured the user is pointed at the settings, not at Drive",
  );

  // ------------------------------------------------------------- index stats
  const statsOpen = openIndexForWrite(path.join(tempDir("stats"), "i.sqlite"));
  assert(statsOpen.kind === "opened", "a database opens for the stats check");
  if (statsOpen.kind === "opened") {
    const statsFile = path.join(
      path.dirname(
        (
          statsOpen.db.prepare("PRAGMA database_list").get() as {
            file: string;
          }
        ).file,
      ),
      "i.sqlite",
    );
    const addRow = (
      full: string,
      opts: { dir?: boolean; link?: string } = {},
    ) =>
      statsOpen.db
        .prepare(
          `INSERT INTO files (path,name,parent,root,is_dir,is_symlink,size,mtime_ms,birthtime_ms,storage_path,scan_id)
           VALUES (?,?,?,'/s',?,?,1,1,1,?,1)`,
        )
        .run(
          full,
          path.basename(full),
          path.dirname(full),
          opts.dir ? 1 : 0,
          opts.link ? 1 : 0,
          opts.link ?? null,
        );
    addRow("/s/one.txt");
    addRow("/s/two.txt");
    addRow("/s/folder", { dir: true });
    addRow("/s/link.txt", { link: "/s/one.txt" });
    addRow("/s/link-dir", { dir: true, link: "/s/folder" });

    const stats = readIndexStats(statsOpen.db, statsFile);
    assert(
      stats.entries === 5 &&
        stats.files === 2 &&
        stats.directories === 1 &&
        stats.symlinks === 2,
      `every row is counted once, a link as a link (${JSON.stringify(stats)})`,
    );
    assert(
      stats.entries === stats.files + stats.directories + stats.symlinks,
      "the category counts add up to the total",
    );
    assert(stats.bytes > 0, "disk usage is reported");
    assert(
      stats.lastDurationMs === undefined,
      "an unrecorded duration is absent rather than zero",
    );
    writeLastDuration(statsOpen.db, 135_736);
    assert(
      readIndexStats(statsOpen.db, statsFile).lastDurationMs === 135_736,
      "the last scan duration round-trips",
    );
    writeLastDuration(statsOpen.db, 42);
    assert(
      readIndexStats(statsOpen.db, statsFile).lastDurationMs === 42,
      "a later scan replaces the recorded duration",
    );
    statsOpen.db.close();
  }

  // ------------------------------------------------- the coverage status line
  /*
   * describeCoverage is pure, so the cases are built rather than opened.
   *
   * `complete` is the stored integer, 0 or 1, not a boolean. The count runs
   * through toLocaleString, so every expectation below formats it the same way
   * rather than writing out one locale's digit grouping.
   *
   * Only a ready index reaches here. The parameter is narrowed to that, and
   * `isReadyCoverage` is the only way in, so a missing or unreadable index
   * cannot be described by this function at all; indexCaveat in status-line.ts
   * words those two states itself, naming the action that fixes them.
   */
  const coveredRoot = (
    name: string,
    complete: number,
    files: number,
  ): IndexRoot => ({
    root: name,
    scannedAt: 0,
    complete,
    files,
    note: null,
  });
  // The narrowing predicate is the only door in, so check it answers correctly.
  for (const [status, ready] of [
    ["ready", true],
    ["missing", false],
    ["failed", false],
  ] as [string, boolean][])
    assert(
      isReadyCoverage({ status, roots: [], files: 0 } as IndexCoverage) ===
        ready,
      `a ${status} index ${ready ? "is" : "is not"} describable coverage`,
    );
  assert(
    !isReadyCoverage(undefined),
    "and an absent coverage read is not describable either",
  );
  for (const [coverage, wanted, label] of [
    [
      { status: "ready", roots: [], files: 0 },
      `${(0).toLocaleString()} indexed · no indexed locations`,
      "an empty index says it covers no locations",
    ],
    [
      { status: "ready", roots: [coveredRoot("/a", 1, 1)], files: 1 },
      `${(1).toLocaleString()} indexed`,
      "one complete location reports the count alone",
    ],
    [
      {
        status: "ready",
        roots: [coveredRoot("/a", 1, 0), coveredRoot("/b", 1, 0)],
        files: 0,
      },
      `${(0).toLocaleString()} indexed`,
      "complete locations holding nothing report a count of zero",
    ],
    [
      {
        status: "ready",
        roots: [coveredRoot("/a", 1, 1_234_000), coveredRoot("/b", 0, 567)],
        files: 1_234_567,
      },
      `${(1_234_567).toLocaleString()} indexed · 1 of 2 locations incomplete`,
      "a partly scanned location is counted against the total",
    ],
    [
      {
        status: "ready",
        roots: [coveredRoot("/a", 0, 1), coveredRoot("/b", 0, 1)],
        files: 2,
      },
      `${(2).toLocaleString()} indexed · 2 of 2 locations incomplete`,
      "every location incomplete is reported as all of them",
    ],
    [
      { status: "ready", roots: [coveredRoot("/a", 0, 0)], files: 0 },
      `${(0).toLocaleString()} indexed · 1 of 1 locations incomplete`,
      "a single location that scanned nothing is reported as incomplete",
    ],
  ] as [IndexCoverage, string, string][]) {
    const line = describeCoverage(coverage);
    assert(line === wanted, `${label} (${line})`);
  }
  // ---------------------------------------- a root dropped out of scope
  const scopeDir = tempDir("scope");
  const scopeFile = path.join(scopeDir, "index.sqlite");
  const rootA = path.join(scopeDir, "a");
  const rootB = path.join(scopeDir, "b");
  for (const dir of [rootA, rootB]) fs.mkdirSync(dir);
  const pass = async <T>(work: (owned: () => void) => Promise<T>) =>
    work(() => {});
  const foundFdStub = () =>
    ({ kind: "found", path: "/unused", source: "known" }) as const;

  const both = await rebuildIndex({
    file: scopeFile,
    withLock: pass,
    roots: [rootA, rootB],
    lookupFd: foundFdStub,
    spawnFd: (args) =>
      fdOutput([
        path.join(args.at(-1)!, `${path.basename(args.at(-1)!)}-doc.txt`),
      ]),
  });
  assert(
    both.kind === "done" && both.report.forgotten.length === 0,
    "a first scan of every configured root forgets nothing",
  );
  assert(
    searchIndex(scopeFile, parseQuery("doc")).entries.length === 2,
    "both roots contribute rows",
  );

  // Rescan with one root removed from the configuration.
  const narrowed = await rebuildIndex({
    file: scopeFile,
    withLock: pass,
    roots: [rootA],
    lookupFd: foundFdStub,
    spawnFd: () => fdOutput([path.join(rootA, "a-doc.txt")]),
  });
  assert(
    narrowed.kind === "done" &&
      narrowed.report.forgotten.length === 1 &&
      narrowed.report.forgotten[0] === rootB,
    "a complete rescan reports the root it dropped",
  );
  const afterNarrow = searchIndex(scopeFile, parseQuery("doc"));
  assert(
    afterNarrow.entries.length === 1 &&
      afterNarrow.entries[0].path.startsWith(rootA),
    "rows for the removed root are gone, so rebuilding is enough to forget it",
  );
  const coverageRoots = () => {
    const opened = openIndexForRead(scopeFile);
    if (opened.kind !== "opened") return [];
    try {
      return readIndexRoots(opened.db).map((entry) => entry.root);
    } finally {
      opened.db.close();
    }
  };
  assert(
    coverageRoots().every((root) => root !== rootB),
    "and the status line stops reporting it as an indexed location",
  );

  // A run that did not finish must not be read as "the root was removed".
  const reAdded = await rebuildIndex({
    file: scopeFile,
    withLock: pass,
    roots: [rootA, rootB],
    lookupFd: foundFdStub,
    spawnFd: (args) =>
      fdOutput([
        path.join(args.at(-1)!, `${path.basename(args.at(-1)!)}-doc.txt`),
      ]),
  });
  assert(
    reAdded.kind === "done" && reAdded.report.complete,
    "putting the root back indexes it again",
  );
  const cappedRescan = await rebuildIndex({
    file: scopeFile,
    withLock: pass,
    roots: [rootA],
    lookupFd: foundFdStub,
    maxEntries: 0,
    spawnFd: () => fdOutput([path.join(rootA, "a-doc.txt")]),
  });
  assert(
    cappedRescan.kind === "done" && !cappedRescan.report.complete,
    "a capped rescan is incomplete",
  );
  assert(
    cappedRescan.kind === "done" && cappedRescan.report.forgotten.length === 0,
    "an incomplete rescan forgets nothing, because absence is not meaningful",
  );
  assert(
    searchIndex(scopeFile, parseQuery("doc")).entries.length === 2,
    "so the out-of-scope root's rows survive a scan that did not finish",
  );
  closeIndexReader();

  // A settings edit wins if it finishes before the rebuild takes its lock.
  // Exercise real scan cleanup: stale roots must neither delete re-added
  // coverage nor keep a location that the latest configuration removed.
  for (const [label, before, after] of [
    ["re-added scope", [rootA], [rootA, rootB]],
    ["removed scope", [rootA, rootB], [rootA]],
    ["first scope", [], [rootB]],
  ] as [string, string[], string[]][]) {
    let scopes = before;
    const updated = await rebuildIndex({
      file: scopeFile,
      withLock: async (work) => {
        scopes = after;
        return work(() => {});
      },
      loadSettings: async () => ({
        ...DEFAULT_SETTINGS,
        scopes,
        includeDrive: false,
      }),
      lookupFd: foundFdStub,
      spawnFd: (args) => fdOutput([path.join(args.at(-1)!, "doc.txt")]),
    });
    assert(
      updated.kind === "done" &&
        updated.report.complete &&
        coverageRoots().sort().join("\0") === [...after].sort().join("\0"),
      `${label}: a rebuild uses the configuration current at lock acquisition`,
    );
    assert(
      searchIndex(scopeFile, parseQuery("doc")).entries.length === after.length,
      `${label}: searchable coverage matches the latest configured scopes`,
    );
    closeIndexReader();
  }

  // ------------------------------------- a scan killed before it finished
  const killedDir = tempDir("killed");
  const killedFile = path.join(killedDir, "index.sqlite");
  const killedOpen = openIndexForWrite(killedFile);
  assert(killedOpen.kind === "opened", "the index opens for the kill test");
  if (killedOpen.kind === "opened") {
    const add = (name: string) =>
      killedOpen.db
        .prepare(
          `INSERT INTO files (path,name,parent,root,is_dir,is_symlink,size,mtime_ms,birthtime_ms,storage_path,scan_id)
           VALUES (?,?,'/k','/k',0,0,1,1,1,NULL,1)`,
        )
        .run(`/k/${name}`, name);
    add("before-suspend.txt");
    suspendFtsSync(killedOpen.db);
    assert(
      ftsSuspended(killedOpen.db),
      "suspending records that a scan is mid-flight",
    );
    // Written while maintenance is off, so the FTS index cannot see it.
    add("during-suspend.txt");
    assert(
      queryIndex(killedOpen.db, parseQuery("during")).entries.length === 0,
      "a row written while suspended is not findable yet",
    );
    // Leave without resuming, exactly as a killed process would.
    killedOpen.db.close();

    const reopened = openIndexForWrite(killedFile);
    assert(reopened.kind === "opened", "the index reopens after the kill");
    if (reopened.kind === "opened") {
      assert(
        !ftsSuspended(reopened.db),
        "reopening clears the mid-flight marker",
      );
      assert(
        queryIndex(reopened.db, parseQuery("during")).entries.length === 1,
        "and rebuilds the index, so the row written while suspended is findable",
      );
      assert(
        queryIndex(reopened.db, parseQuery("before")).entries.length === 1,
        "without losing what was there already",
      );
      reopened.db.close();
    }
  }
  fs.rmSync(killedDir, { recursive: true, force: true });

  // ------------------------------------------------- progress across roots
  const progDir = tempDir("progress");
  const progFile = path.join(progDir, "index.sqlite");
  const progA = path.join(progDir, "a");
  const progB = path.join(progDir, "b");
  for (const dir of [progA, progB]) fs.mkdirSync(dir);
  const reported: { scanned: number; indexed: number; elapsedMs: number }[] =
    [];
  const progBuilt = await rebuildIndex({
    file: progFile,
    withLock: async <T>(work: (owned: () => void) => Promise<T>) =>
      work(() => {}),
    roots: [progA, progB],
    lookupFd: () => ({ kind: "found", path: "/unused", source: "known" }),
    onProgress: (progress) => reported.push({ ...progress }),
    spawnFd: (args) => {
      const root = args.at(-1)!;
      // Two batches per root, so progress is reported more than once each.
      return fdOutput(
        Array.from({ length: 1500 }, (_, i) =>
          path.join(root, `f${i}-doc.txt`),
        ),
      );
    },
  });
  assert(progBuilt.kind === "done", "a two-root scan reports progress");
  assert(
    reported.length >= 4,
    `progress is reported per batch (${reported.length})`,
  );
  assert(
    reported.every((p, i) => i === 0 || p.indexed >= reported[i - 1].indexed),
    "the indexed count never goes backwards when the scan moves to the next root",
  );
  assert(
    reported.every(
      (p, i) => i === 0 || p.elapsedMs >= reported[i - 1].elapsedMs,
    ),
    "nor does the elapsed time",
  );
  assert(
    progBuilt.kind === "done" &&
      reported.at(-1)!.indexed === progBuilt.report.indexed,
    `the last report matches what the scan did (${reported.at(-1)!.indexed} vs ${progBuilt.kind === "done" ? progBuilt.report.indexed : "?"})`,
  );
  closeIndexReader();
  fs.rmSync(progDir, { recursive: true, force: true });

  // ------------------------------- searching, refreshing, and deleting at once
  const raceDir = tempDir("race");
  const raceFile = path.join(raceDir, "index.sqlite");
  // A file of the user's, sitting in the same directory as the index.
  const userFile = path.join(raceDir, "a real document.txt");
  fs.writeFileSync(userFile, "not ours to delete");

  // One exclusion lock, shared by the rebuild and the deletion, as in the app.
  let lockHeld = false;
  const exclusive = async <T>(work: (owned: () => void) => Promise<T>) => {
    if (lockHeld) return undefined;
    lockHeld = true;
    try {
      return await work(() => {
        if (!lockHeld) throw new Error("lock lost");
      });
    } finally {
      lockHeld = false;
    }
  };

  const raceBuilt = await rebuildIndex({
    file: raceFile,
    withLock: exclusive,
    roots: [raceDir],
    lookupFd: () => ({ kind: "found", path: "/unused", source: "known" }),
    spawnFd: () => fdOutput([path.join(raceDir, "alpha-doc.txt")]),
  });
  assert(
    raceBuilt.kind === "done",
    "the index builds under the exclusion lock",
  );

  // A search opens the cached reader and holds it.
  const firstRead = searchIndex(raceFile, parseQuery("alpha"));
  assert(
    firstRead.status === "ready" && firstRead.entries.length === 1,
    "a search reads the freshly built index",
  );

  // A refresh runs while that reader is cached. rebuildIndex drops the cached
  // connection on the way out, so the next search sees the new rows.
  const refreshed = await rebuildIndex({
    file: raceFile,
    withLock: exclusive,
    roots: [raceDir],
    lookupFd: () => ({ kind: "found", path: "/unused", source: "known" }),
    spawnFd: () => fdOutput([path.join(raceDir, "beta-doc.txt")]),
  });
  assert(refreshed.kind === "done", "a refresh runs while a reader is cached");
  assert(
    searchIndex(raceFile, parseQuery("beta")).entries.length === 1,
    "the next search sees rows written by the refresh",
  );
  assert(
    searchIndex(raceFile, parseQuery("alpha")).entries.length === 0,
    "a complete refresh removed the stale row the reader had seen",
  );
  // The status line must use scan summaries, not synchronously scan every path.
  const prepare = DatabaseSync.prototype.prepare;
  try {
    DatabaseSync.prototype.prepare = function (sql: string) {
      if (/count\(\*\).*FROM files\b/iu.test(sql))
        throw new Error("A screen must not recount the file table");
      return prepare.call(this, sql);
    };
    const coverage = readIndexCoverage(raceFile);
    assert(
      coverage.status === "ready" && coverage.files === 1,
      "coverage reads the saved scan total without scanning the file table",
    );
  } finally {
    DatabaseSync.prototype.prepare = prepare;
  }

  // A deletion cannot start while a refresh holds the lock, and vice versa.
  let deletedDuringRefresh: number | undefined;
  const blockedRefresh = await rebuildIndex({
    file: raceFile,
    withLock: exclusive,
    roots: [raceDir],
    lookupFd: () => ({ kind: "found", path: "/unused", source: "known" }),
    spawnFd: () =>
      (async function* () {
        // Deletion attempts to take the same lock mid-scan.
        deletedDuringRefresh = await exclusive(async () =>
          deleteIndexDatabase(raceFile),
        );
        yield Buffer.from(`${path.join(raceDir, "gamma-doc.txt")}\0`, "utf8");
      })(),
  });
  assert(
    blockedRefresh.kind === "done",
    "the refresh finishes despite a deletion attempt",
  );
  assert(
    deletedDuringRefresh === undefined,
    "deletion cannot delete the index while a refresh holds the lock",
  );
  assert(
    searchIndex(raceFile, parseQuery("gamma")).entries.length === 1,
    "and the refresh's own rows survived the attempt",
  );

  // Deleting under the lock, with the reader closed first, as erase.ts does.
  closeIndexReader();
  const deleted = await exclusive(async () => deleteIndexDatabase(raceFile));
  assert(
    deleted !== undefined && deleted > 0,
    "deletion runs once the lock is free",
  );
  assert(
    searchIndex(raceFile, parseQuery("beta")).status === "missing",
    "a search after deletion reports a missing index rather than failing",
  );
  assert(
    fs.existsSync(userFile) &&
      fs.readFileSync(userFile, "utf8") === "not ours to delete",
    "deletion leaves a real file in the same directory untouched",
  );
  assert(
    fs.readdirSync(raceDir).join("|") === "a real document.txt",
    "nothing but the index files is removed",
  );
  closeIndexReader();

  // Deletion removes the files and reports the bytes.
  const removed = deleteIndexDatabase(liveFile);
  assert(removed > 0, "deleting the index reports the bytes it removed");
  assert(!fs.existsSync(liveFile), "the index file is gone after deletion");
  assert(
    deleteIndexDatabase(liveFile) === 0,
    "deleting an absent index is not an error",
  );

  assert(
    countIndexedFiles(searchDb) > 0,
    "the indexed file count is available for the status line",
  );

  // ------------------------------------------------- the deletion summary
  /*
   * The sentence the user reads after deleting everything.
   *
   * countEntries is not exported, and erase.ts reaches @raycast/api at import
   * time, which does not exist outside Raycast. Both functions are therefore
   * read from source and evaluated. The span is anchored, so a rename fails
   * rather than passing vacuously.
   */
  const eraseModule = { exports: {} as Record<string, unknown> };
  const erase = new Function(
    "module",
    "exports",
    // The real formatSize, so the sentence is checked against what ships.
    "formatSize",
    transformSync(
      between(
        fs.readFileSync("src/lib/erase.ts", "utf8"),
        "function countEntries",
        "/** Clears all extension-owned",
      ),
      { loader: "ts", format: "cjs" },
    ).code + "\nreturn { countEntries, describeErased };",
  )(eraseModule, eraseModule.exports, formatSize) as {
    countEntries: (raw: unknown) => number;
    describeErased: (erased: Erased) => string;
  };

  for (const [raw, wanted, label] of [
    [undefined, 0, "a key absent from storage counts nothing"],
    [null, 0, "a null value counts nothing"],
    [7, 0, "a value that is not a string counts nothing"],
    [
      { toString: () => "[1,2,3]" },
      0,
      "a value that is not a string is not coerced into one first",
    ],
    ["", 0, "an empty string counts nothing"],
    ["not json", 0, "unparseable storage counts nothing rather than throwing"],
    ["null", 0, "stored null counts nothing"],
    ["7", 0, "a stored number counts nothing"],
    ['"text"', 0, "a stored string counts nothing"],
    ["[]", 0, "an empty list counts nothing"],
    ["[1]", 1, "a one-element list counts one"],
    ["[1,2,3]", 3, "a list counts its elements"],
    ["{}", 0, "an empty collection counts nothing"],
    ['{"a":1,"b":2}', 2, "a plain collection counts its keys"],
    ['{"items":{}}', 0, "an empty visit log counts nothing"],
    [
      '{"items":{"a":1,"b":2}}',
      2,
      "a visit log counts the records nested under items",
    ],
    ['{"items":null}', 0, "a visit log with no records counts nothing"],
    ['{"items":7}', 0, "a visit log holding the wrong shape counts nothing"],
    [
      '{"items":[1,2,3]}',
      3,
      "records stored as a list under items are counted too",
    ],
  ] as [unknown, number, string][]) {
    const counted = erase.countEntries(raw);
    assert(counted === wanted, `${label} (${counted})`);
  }

  const erasedOf = (over: Partial<Erased>): Erased => ({
    visits: 0,
    pins: 0,
    searches: 0,
    abbreviations: 0,
    cacheBytes: 0,
    ...over,
  });
  const noIndex = "0 ranked items, 0 pins, 0 searches, 0 learned shortcuts";
  for (const [erased, wanted, label] of [
    [
      erasedOf({}),
      noIndex,
      "deleting nothing reports a zero of every kind and no index",
    ],
    [
      erasedOf({
        visits: 1,
        pins: 1,
        searches: 1,
        abbreviations: 1,
        cacheBytes: 1024,
      }),
      "1 ranked item, 1 pin, 1 search, 1 learned shortcut, and 1.0 KB of index",
      "one of each kind is reported in the singular, with the index size",
    ],
    [
      erasedOf({
        visits: 1_234_567,
        pins: 4096,
        searches: 120,
        abbreviations: 37,
        cacheBytes: 1024 * 1024 * 3,
      }),
      "1234567 ranked items, 4096 pins, 120 searches, 37 learned shortcuts, and 3.0 MB of index",
      "large counts are printed in full, and the size picks its own unit",
    ],
    [
      erasedOf({ cacheBytes: 512 }),
      `${noIndex}, and 512 B of index`,
      "half a kilobyte is reported in bytes rather than rounded to a kilobyte",
    ],
    [
      erasedOf({ cacheBytes: 1536 }),
      `${noIndex}, and 1.5 KB of index`,
      "a kilobyte and a half keeps its half",
    ],
    [
      erasedOf({ cacheBytes: 1 }),
      `${noIndex}, and 1 B of index`,
      "a single byte is reported as one byte, not as nought kilobytes",
    ],
    [
      erasedOf({ cacheBytes: -1 }),
      noIndex,
      "a byte count below zero leaves the index out of the sentence",
    ],
  ] as [Erased, string, string][]) {
    const sentence = erase.describeErased(erased);
    assert(sentence === wanted, `${label} (${sentence})`);
  }
  assert(
    erase.describeErased({
      pins: 2,
      searches: 0,
      abbreviations: 0,
      cacheBytes: 0,
    } as unknown as Erased) ===
      "0 ranked items, 2 pins, 0 searches, 0 learned shortcuts",
    "a count missing from the record reads as zero, not as the word undefined",
  );

  // ----------------------------------------------------------- build outcomes
  const buildDir = tempDir("build");
  const buildFile = path.join(buildDir, "index.sqlite");
  // A lock that always succeeds, and one that reports itself busy.
  const freeLock = async <T>(work: (assertOwned: () => void) => Promise<T>) =>
    work(() => {});
  const busyLock = async () => undefined;
  const foundFd = () =>
    ({ kind: "found", path: "/bin/true", source: "known" }) as const;

  const noFd = await rebuildIndex({
    file: buildFile,
    withLock: freeLock,
    lookupFd: () => ({ kind: "missing", reason: "not here" }),
  });
  assert(
    noFd.kind === "no-fd" && /brew install fd/u.test(noFd.message),
    "a missing fd reports install instructions and installs nothing",
  );
  assert(
    !fs.existsSync(buildFile),
    "a missing fd does not create an index file",
  );
  const noRoots = await rebuildIndex({
    file: buildFile,
    withLock: freeLock,
    lookupFd: foundFd,
    roots: [],
  });
  assert(
    noRoots.kind === "no-roots",
    "no mounted Drive is reported rather than scanning nothing silently",
  );

  // A busy lock must not be mistaken for a successful empty scan.
  const busyRoot = path.join(buildDir, "tree");
  fs.mkdirSync(busyRoot, { recursive: true });
  const busy = await rebuildIndex({
    file: buildFile,
    withLock: busyLock,
    lookupFd: foundFd,
    roots: [busyRoot],
  });
  assert(
    busy.kind === "failed" && /active/u.test(busy.message),
    "a rebuild that cannot take the lock is reported, not silently skipped",
  );

  // A real end-to-end build through the orchestration, with fd injected.
  fs.writeFileSync(path.join(busyRoot, "orchestrated.txt"), "o");
  let ownedChecks = 0;
  const built = await rebuildIndex({
    file: buildFile,
    withLock: async (work) =>
      work(() => {
        ownedChecks += 1;
      }),
    lookupFd: foundFd,
    roots: [busyRoot],
    spawnFd: () => fdOutput([path.join(busyRoot, "orchestrated.txt")]),
  });
  assert(
    built.kind === "done" && built.report.complete,
    "the orchestration builds an index and reports completion",
  );
  assert(ownedChecks > 0, "lock ownership is asserted before the scan writes");
  const builtRead = openIndexForRead(buildFile);
  assert(
    builtRead.kind === "opened" &&
      queryIndex(builtRead.db, parseQuery("orchestrated")).entries.length === 1,
    "the built index is immediately queryable",
  );
  if (builtRead.kind === "opened") builtRead.db.close();
  fs.rmSync(buildDir, { recursive: true, force: true });

  const driveRoots = await googleDriveIndexRoots(
    path.join(tempDir("cloud"), "absent"),
  );
  assert(
    driveRoots.length === 0,
    "a missing CloudStorage directory yields no roots",
  );
  const cloud = tempDir("cloud2");
  fs.mkdirSync(path.join(cloud, "GoogleDrive-someone@example.com"));
  fs.mkdirSync(path.join(cloud, "Dropbox"));
  fs.writeFileSync(path.join(cloud, "GoogleDrive-file"), "not a directory");
  const detected = await googleDriveIndexRoots(cloud);
  assert(
    detected.length === 1 &&
      detected[0].endsWith("GoogleDrive-someone@example.com"),
    "Google Drive roots are detected by directory name, not a hardcoded account",
  );

  const report = describeScan({
    roots: [
      {
        root: "/a",
        scanned: 10,
        indexed: 8,
        elapsedMs: 2000,
        complete: false,
        stopped: "time-limit",
      },
    ],
    scanned: 10,
    indexed: 8,
    elapsedMs: 2000,
    complete: false,
    forgotten: [],
  });
  assert(
    report.includes("8 indexed") &&
      report.includes("10 seen") &&
      report.includes("time limit") &&
      !report.includes("%"),
    `the scan summary reports counts and elapsed time with no invented percentage (${report})`,
  );
  const forgotReport = describeScan({
    roots: [
      {
        root: "/a",
        scanned: 4,
        indexed: 4,
        elapsedMs: 100,
        complete: true,
      },
    ],
    scanned: 4,
    indexed: 4,
    elapsedMs: 100,
    complete: true,
    forgotten: ["/gone"],
  });
  assert(
    forgotReport.includes("no longer in scope"),
    `the summary says when an out-of-scope location was removed (${forgotReport})`,
  );

  // --------------------------------------------------- real fd, when installed
  const realFd = findFd();
  if (realFd.kind === "found") {
    const shortcutDir = tempDir("hidden-shortcut");
    const shortcutRoot = path.join(shortcutDir, "tree");
    const target = path.join(
      shortcutRoot,
      ".shortcut-targets-by-id",
      "id",
      "Shared Folder",
    );
    const visibleLink = path.join(shortcutRoot, "Shared Folder");
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, "report.txt"), "visible");
    fs.writeFileSync(path.join(target, ".private.txt"), "hidden");
    fs.symlinkSync(target, visibleLink);
    const shortcutDb = openWritable(shortcutDir);
    try {
      for (const showHidden of [false, true]) {
        const result = await scanRoot(
          shortcutRoot,
          {
            fd: realFd.path,
            roots: [shortcutRoot],
            db: shortcutDb,
            showHidden,
          },
          Date.now() + 60_000,
        );
        const paths = rowPaths(shortcutDb);
        assert(
          result.complete,
          `shared-folder scan completes with hidden files ${showHidden ? "on" : "off"}`,
        );
        assert(
          paths.includes(path.join(visibleLink, "report.txt")),
          `a visible shortcut into hidden storage is followed with hidden files ${showHidden ? "on" : "off"}`,
        );
        assert(
          paths.includes(path.join(visibleLink, ".private.txt")) === showHidden,
          `hidden files inside a shortcut respect the hidden setting (${showHidden})`,
        );
        assert(
          paths.includes(path.join(target, "report.txt")) === showHidden,
          `direct hidden-target enumeration follows the hidden setting (${showHidden})`,
        );
      }
    } finally {
      shortcutDb.close();
      fs.rmSync(shortcutDir, { recursive: true, force: true });
    }
    const realDir = tempDir("realfd");
    const realRoot = path.join(realDir, "tree");
    fs.mkdirSync(path.join(realRoot, "inner"), { recursive: true });
    fs.writeFileSync(path.join(realRoot, "inner", "target.txt"), "t");
    fs.mkdirSync(path.join(realRoot, "node_modules", "pkg"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(realRoot, "node_modules", "pkg", "skip.js"),
      "s",
    );
    fs.mkdirSync(path.join(realRoot, ".dotdir"));
    fs.writeFileSync(path.join(realRoot, ".dotdir", "dotfile.txt"), "d");
    await fsp.symlink(
      path.join(realRoot, "inner"),
      path.join(realRoot, "visible"),
    );
    // A loop: the link points back above itself.
    await fsp.symlink(realRoot, path.join(realRoot, "inner", "loop"));
    await fsp.symlink(
      path.join(realDir, "absent"),
      path.join(realRoot, "broken"),
    );

    const realDb = openWritable(realDir);
    const outcome = await scanRoot(
      realRoot,
      { fd: realFd.path, roots: [realRoot], db: realDb },
      Date.now() + 60_000,
    );
    const indexedPaths = rowPaths(realDb);
    assert(
      !outcome.complete && outcome.error !== undefined,
      "a real fd crawl with traversal diagnostics preserves prior coverage",
    );
    assert(
      indexedPaths.some((p) => p.endsWith(path.join("visible", "target.txt"))),
      "the visible path through a symlink is indexed, not the resolved target",
    );
    assert(
      indexedPaths.some((p) => p.endsWith(path.join("inner", "target.txt"))),
      "the real path is indexed as its own entry",
    );
    assert(
      !indexedPaths.some((p) => p.includes("node_modules")),
      "exclusions apply to a real crawl",
    );
    assert(
      indexedPaths.some((p) => p.endsWith("dotfile.txt")),
      "hidden entries are indexed",
    );
    assert(
      indexedPaths.some((p) => p.endsWith("broken")),
      "a broken symlink stays findable",
    );
    const brokenRow = realDb
      .prepare("SELECT is_symlink, mtime_ms FROM files WHERE path = ?")
      .get(path.join(realRoot, "broken")) as {
      is_symlink: number;
      mtime_ms: number;
    };
    assert(
      brokenRow.is_symlink === 1,
      "a broken symlink is recorded as a symlink",
    );
    const found = queryIndex(realDb, parseQuery("target"));
    assert(
      found.entries.length >= 2,
      "both routes to one file are separately searchable",
    );
    realDb.close();
    fs.rmSync(realDir, { recursive: true, force: true });
  }

  scanDb.close();
  searchDb.close();
  for (const dir of [schemaDir, scanDir, searchDir, liveDir, raceDir, scopeDir])
    fs.rmSync(dir, { recursive: true, force: true });
}
