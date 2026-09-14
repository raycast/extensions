/**
 * Ranking harness — runs the scoring engine outside Raycast. The default suite
 * uses synthetic data only. Live diagnostics are opt-in and report counts and
 * timings without printing local paths or filenames.
 *
 *   npm run harness
 *   npm run harness:live
 *   npm run harness:live -- /folder/to/check
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { performanceChecks } from "./performance-checks";
import { indexingChecks } from "./indexing-checks";
import { indexChecks } from "./index-checks";
import { indexSafetyChecks } from "./index-safety-checks";
import { rankSourcesChecks } from "./rank-sources-checks";
import { cachedEntryChecks } from "./cached-entry-checks";
import { browserChecks } from "./browser-checks";
import { eventHandleChecks } from "./event-handle-checks";
import { searchScreenChecks } from "./search-screen-checks";
import { liveSearchChecks } from "./live-search-checks";
import { resultOrderChecks } from "./result-order-checks";
import { typeFilterChecks } from "./type-filter-checks";
import { rowRenderChecks } from "./row-render-checks";
import { caveatChecks, listViewChecks } from "./list-view-checks";
import { accessoryColumnChecks } from "./accessory-column-checks";
import {
  canonicalPath,
  isNoisyPath,
  locationLabel,
  sharedCloudFolderResult,
  sharedCloudFolders,
  readDirectory,
  relativeDepth,
  normalizeDir,
  splitPathQuery,
  statEntry,
} from "../src/lib/read-dir";
import {
  cloudPathCandidates,
  standardPathCandidates,
} from "../src/lib/starting-paths";
import { readUsageMetaResult } from "../src/lib/spotlight";
import { findFd, describeFdLookup } from "../src/lib/fd";
import { googleDriveIndexRoots, rebuildIndex } from "../src/lib/index-build";
import { closeIndexReader, searchIndex } from "../src/lib/index-reader";
import { openIndexForRead } from "../src/lib/index-db";
import { ScoreParts, scoreEntry } from "../src/lib/score";
import {
  MATCH,
  ORDER_PENALTY,
  matchPath,
  matchQuality,
  matchTier,
  matchesStats,
  parseQuery,
} from "../src/lib/query";
import {
  LAMBDA,
  MAX_EMS,
  MAX_PER_ABBREVIATION,
  emsScore,
  mergeAbbreviation,
  pruneVisits,
  recordEms,
} from "../src/lib/history";
import { hiddenOnly } from "../src/lib/query";
import {
  Progress,
  deriveProgress,
  describeProgress,
  isSettled,
  rowsCanChange,
  missingUsagePaths,
  statusLight,
} from "../src/lib/progress";
import { VisitLog } from "../src/lib/types";
import { Entry, Visit, Visits } from "../src/lib/types";
import { entryStoragePath, rowIdForEntry } from "../src/lib/entry-identity";

let failures = 0;

function assert(cond: boolean, label: string) {
  if (!cond) failures++;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${label}`);
}

type Row = { entry: Entry; tier: number; score: ScoreParts };

function rank(
  entries: Entry[],
  visits: Visits,
  query: string,
  root?: string,
  tick = 0,
): Row[] {
  const now = Date.now();
  const rows: Row[] = [];
  for (const entry of entries) {
    const tier = matchTier(query, entry.name);
    if (tier === undefined) continue;
    const depth = root ? relativeDepth(root, entry.path) : 0;
    rows.push({
      entry,
      tier,
      score: scoreEntry(entry, {
        visit: visits[entry.path],
        now,
        tick,
        depthBelow: depth,
      }),
    });
  }
  rows.sort((a, b) =>
    a.tier !== b.tier
      ? a.tier - b.tier
      : b.score.total !== a.score.total
        ? b.score.total - a.score.total
        : a.entry.name.localeCompare(b.entry.name, undefined, {
            numeric: true,
          }),
  );
  return rows;
}

const DAY = 86_400_000;
function fake(name: string, ageDays: number): Entry {
  return {
    name,
    path: `/fake/${name}`,
    isDirectory: false,
    isSymlink: false,
    size: 1,
    mtimeMs: Date.now() - ageDays * DAY,
    birthtimeMs: Date.now() - ageDays * DAY,
  };
}

async function main() {
  await typeFilterChecks(assert);
  await cachedEntryChecks(assert);
  await browserChecks(assert);
  await eventHandleChecks(assert);
  await searchScreenChecks(assert);
  resultOrderChecks(assert);
  listViewChecks(assert);
  caveatChecks(assert);
  accessoryColumnChecks(assert);
  await rowRenderChecks(assert);
  await liveSearchChecks(assert);
  await indexChecks(assert);
  await indexSafetyChecks(assert);
  rankSourcesChecks(assert);
  await indexingChecks(assert);
  await performanceChecks(assert);
  const live = process.argv.includes("--live");
  const targetArg = process.argv.slice(2).find((arg) => arg !== "--live");
  const target = targetArg
    ? targetArg.replace(/^~/, os.homedir())
    : `${os.homedir()}/Downloads`;

  console.log("\n=== matchTier ===");
  assert(matchTier("rep", "report.pdf") === MATCH.PREFIX, "prefix wins");
  assert(
    matchTier("rep", "2026 Q3 report.pdf") === MATCH.WORD_PREFIX,
    "word-boundary prefix after a space",
  );
  assert(
    matchTier("q3", "widget_q3_notes.tex") === MATCH.WORD_PREFIX,
    "underscore is a word break",
  );
  assert(
    matchTier("ort", "report.pdf") === MATCH.SUBSTRING,
    "mid-word substring",
  );
  assert(
    matchTier("wdgq3", "Widget Q3 Lecture Notes") === MATCH.SUBSEQUENCE,
    "subsequence across gaps",
  );
  assert(matchTier("zzz", "report.pdf") === undefined, "non-match excluded");
  assert(
    matchTier("", "anything") === MATCH.PREFIX,
    "empty query matches everything at top tier",
  );
  assert(matchTier("REP", "report.pdf") === MATCH.PREFIX, "case-insensitive");

  console.log("\n=== README query examples ===");
  assert(matchTier("foo", "foo.txt") === MATCH.PREFIX, "foo finds foo.txt");
  assert(
    matchTier("foo", "foo-bar.md") === MATCH.PREFIX,
    "foo finds foo-bar.md",
  );
  assert(
    matchTier("foo", "my-foo-notes.txt") === MATCH.WORD_PREFIX,
    "foo finds my-foo-notes.txt",
  );
  assert(
    matchTier("FOO", "foo.txt") === matchTier("foo", "foo.txt"),
    "FOO is equivalent to foo",
  );
  assert(
    matchTier("bar", "foo-bar.txt") === MATCH.WORD_PREFIX,
    "bar finds foo-bar.txt by word prefix",
  );
  assert(
    matchTier("bar", "foobar.txt") === MATCH.SUBSTRING,
    "bar finds foobar.txt by substring",
  );
  assert(
    matchTier("fbr", "foo-bar.txt") === MATCH.SUBSEQUENCE,
    "fbr finds foo-bar.txt as a subsequence",
  );

  const readmeBazPath = path.join(os.homedir(), "foo", "bar", "baz.txt");
  const readmeOrdered = matchPath(parseQuery("foo baz"), readmeBazPath, false);
  const readmeReversed = matchPath(parseQuery("baz foo"), readmeBazPath, false);
  assert(readmeOrdered !== undefined, "foo baz finds ~/foo/bar/baz.txt");
  assert(
    readmeReversed === (readmeOrdered ?? 0) + ORDER_PENALTY,
    "baz foo ranks below the same path in query order",
  );
  assert(
    (matchPath(parseQuery("foo/bar"), "/foo/bar", true) ?? 99) <
      (matchPath(parseQuery("foo/bar"), "/foo/bar/baz", true) ?? 99),
    "foo/bar prefers bar inside foo",
  );
  assert(
    matchPath(parseQuery("foob"), "/foo/bar", true) === MATCH.PATH_FUZZY,
    "foob matches compactly across path components",
  );

  assert(
    splitPathQuery("~/foo/")?.dir === path.join(os.homedir(), "foo"),
    "~/foo/ lists the foo folder",
  );
  const readmeHomePrefix = splitPathQuery("~/foo/ba");
  assert(
    readmeHomePrefix?.dir === path.join(os.homedir(), "foo") &&
      readmeHomePrefix.prefix === "ba",
    "~/foo/ba filters entries in the foo folder",
  );
  assert(
    splitPathQuery("/tmp/foo/")?.dir === "/tmp/foo",
    "/tmp/foo/ lists an absolute path",
  );

  const readmeDirectories = parseQuery("foo -d");
  assert(
    readmeDirectories.type === "directory" &&
      matchPath(readmeDirectories, "/x/foo", true) !== undefined &&
      matchPath(readmeDirectories, "/x/foo.txt", false) === undefined,
    "foo -d keeps folders only",
  );
  const readmeFiles = parseQuery("foo -f");
  assert(
    readmeFiles.type === "file" &&
      matchPath(readmeFiles, "/x/foo.txt", false) !== undefined &&
      matchPath(readmeFiles, "/x/foo", true) === undefined,
    "foo -f keeps files only",
  );
  assert(
    matchPath(parseQuery("foo ext:txt"), "/x/foo.txt", false) !== undefined,
    "foo ext:txt keeps a txt file",
  );
  const readmeExtensions = parseQuery("bar ext:md,txt");
  assert(
    matchPath(readmeExtensions, "/x/foo-bar.md", false) !== undefined &&
      matchPath(readmeExtensions, "/x/foo-bar.txt", false) !== undefined,
    "bar ext:md,txt accepts either extension",
  );
  assert(
    matchPath(parseQuery("baz ext:tar.gz"), "/x/baz.tar.gz", false) !==
      undefined,
    "baz ext:tar.gz supports a compound extension",
  );

  const readmeAfter = parseQuery("foo after:2026-06");
  assert(
    matchesStats(readmeAfter, {
      mtimeMs: Date.UTC(2026, 6, 1),
      size: 1,
      isDirectory: false,
    }),
    "foo after:2026-06 keeps a later modification date",
  );
  const readmeBefore = parseQuery("foo before:2026");
  assert(
    matchesStats(readmeBefore, {
      mtimeMs: Date.UTC(2025, 11, 31),
      size: 1,
      isDirectory: false,
    }),
    "foo before:2026 keeps an earlier modification date",
  );
  assert(
    readmeBefore.before !== undefined &&
      !matchesStats(readmeBefore, {
        mtimeMs: readmeBefore.before,
        size: 1,
        isDirectory: false,
      }),
    "before: excludes an item exactly on its boundary",
  );
  assert(
    matchesStats(parseQuery("foo size:>10mb"), {
      mtimeMs: 0,
      size: 11 * 1024 ** 2,
      isDirectory: false,
    }),
    "foo size:>10mb keeps a larger file",
  );
  assert(
    matchesStats(parseQuery("bar size:<1.5gb"), {
      mtimeMs: 0,
      size: 1024 ** 3,
      isDirectory: false,
    }),
    "bar size:<1.5gb keeps a smaller file",
  );

  const readmeHidden = parseQuery(".foo bar");
  assert(
    readmeHidden.hidden &&
      matchPath(readmeHidden, "/x/.foo/bar.txt", false) !== undefined,
    ".foo bar searches inside a hidden .foo folder",
  );
  const readmeHiddenDirectories = parseQuery("-d .");
  assert(
    hiddenOnly(readmeHiddenDirectories) &&
      matchPath(readmeHiddenDirectories, "/x/.foo", true) !== undefined &&
      matchPath(readmeHiddenDirectories, "/x/.foo.txt", false) === undefined,
    "-d . keeps hidden folders only",
  );

  assert(
    parseQuery("foo after:2026").after !== undefined &&
      parseQuery("foo after:2026-06").after !== undefined &&
      parseQuery("foo after:2026-06-15").after !== undefined,
    "README date forms all parse",
  );
  assert(
    parseQuery("foo size:>1.5kb").minSize === 1536 &&
      parseQuery("foo size:>10").minSize === 10,
    "README decimal and unitless sizes parse",
  );
  assert(
    parseQuery("foo ext:md ext:txt").extensions.join(",") === "md,txt",
    "README repeated extension filters combine",
  );

  const readmeCombined = parseQuery(
    "foo -f ext:txt after:2026-01-01 before:2027 size:<10mb",
  );
  assert(
    matchPath(readmeCombined, "/x/foo.txt", false) !== undefined &&
      matchesStats(readmeCombined, {
        mtimeMs: Date.UTC(2026, 5, 1),
        size: 1024,
        isDirectory: false,
      }),
    "README combined filter example matches a qualifying file",
  );
  assert(
    parseQuery("ext:txt").longest === "",
    "a filter-only query has no term to ask the index for",
  );

  console.log("\n=== usage metadata failures ===");
  const failedMetadata = await readUsageMetaResult(
    ["/example/foo"],
    { timeoutMs: 100 },
    async () => {
      throw new Error("synthetic failure");
    },
  );
  assert(
    !failedMetadata.complete &&
      failedMetadata.error !== undefined &&
      failedMetadata.partial === undefined,
    "a metadata process failure is distinguishable from absent metadata",
  );
  const slowFailedMetadata = await readUsageMetaResult(
    ["/example/foo", "/example/bar", "/example/baz"],
    { timeoutMs: 25 },
    async (_args, timeoutMs) => {
      await new Promise((resolve) => setTimeout(resolve, timeoutMs + 5));
      throw new Error("synthetic systemic failure");
    },
  );
  assert(
    !slowFailedMetadata.complete &&
      slowFailedMetadata.error !== undefined &&
      slowFailedMetadata.partial === undefined,
    "an all-path metadata failure stays an error when recovery reaches the deadline",
  );
  const oneBadMetadataPath = await readUsageMetaResult(
    ["/example/good-a", "/example/broken", "/example/good-b"],
    { timeoutMs: 1000 },
    async (args) => {
      const paths = args.slice(7);
      if (paths.includes("/example/broken")) {
        throw new Error("synthetic unreadable path");
      }
      const separator = String.fromCharCode(0);
      return paths.map(() => `NULL${separator}3${separator}`).join("");
    },
  );
  assert(
    !oneBadMetadataPath.complete &&
      oneBadMetadataPath.partial !== undefined &&
      oneBadMetadataPath.error === undefined &&
      oneBadMetadataPath.meta.has("/example/good-a") &&
      !oneBadMetadataPath.meta.has("/example/broken") &&
      oneBadMetadataPath.meta.has("/example/good-b"),
    "one unreadable path leaves valid metadata available as a partial result",
  );
  const absentMetadata = await readUsageMetaResult(
    ["/example/foo"],
    { timeoutMs: 100 },
    async () => "NULL\0NULL\0",
  );
  assert(
    absentMetadata.complete && absentMetadata.meta.size === 0,
    "successful NULL metadata is complete rather than failed",
  );
  const timedOutMetadata = await readUsageMetaResult(
    ["/example/foo"],
    { timeoutMs: 0 },
    async () => "NULL\0NULL\0",
  );
  assert(
    !timedOutMetadata.complete &&
      timedOutMetadata.partial !== undefined &&
      timedOutMetadata.error === undefined,
    "a metadata deadline is reported as partial rather than failed",
  );
  const processTimedOutMetadata = await readUsageMetaResult(
    ["/example/foo"],
    { timeoutMs: 100 },
    async () => {
      const error = new Error("synthetic timeout") as NodeJS.ErrnoException;
      error.code = "ETIMEDOUT";
      throw error;
    },
  );
  assert(
    !processTimedOutMetadata.complete &&
      processTimedOutMetadata.partial !== undefined &&
      processTimedOutMetadata.error === undefined,
    "an mdls timeout is partial while other process failures stay errors",
  );
  const killedMetadata = await readUsageMetaResult(
    ["/example/foo"],
    { timeoutMs: 100 },
    async () => {
      const error = new Error("synthetic kill") as Error & {
        killed: boolean;
        signal: string;
      };
      error.killed = true;
      error.signal = "SIGKILL";
      throw error;
    },
  );
  assert(
    !killedMetadata.complete &&
      killedMetadata.partial !== undefined &&
      killedMetadata.error === undefined,
    "the child-process timeout shape used by Raycast is partial",
  );

  console.log("\n=== generated preference contract ===");
  const browserSource = fs.readFileSync(
    path.join(process.cwd(), "src/components/browser.tsx"),
    "utf8",
  );
  const typesSource = fs.readFileSync(
    path.join(process.cwd(), "src/lib/types.ts"),
    "utf8",
  );
  assert(
    browserSource.includes("getPreferenceValues<Preferences>()") &&
      !typesSource.includes("export type Prefs"),
    "preferences come from Raycast's generated manifest types",
  );

  console.log("\n=== manifest ===");
  const manifest = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
  ) as { commands?: { name?: string; interval?: string }[] };
  assert(
    !manifest.commands?.some((command) => command.name === "browse-finder"),
    "the manifest does not expose the removed Finder-scoped search command",
  );
  assert(
    !manifest.commands?.some((command) => command.name === "index-shortcuts"),
    "the manifest does not expose the removed Google Drive shortcut command",
  );
  assert(
    manifest.commands?.every((command) => command.interval === undefined),
    "no command runs on a schedule; every scan is started by the user",
  );
  const rebuild = manifest.commands?.find(
    (command) => command.name === "rebuild-index",
  );
  const settings = manifest.commands?.find(
    (command) => command.name === "index-settings",
  );
  assert(
    rebuild !== undefined && settings !== undefined,
    "the manifest exposes the rebuild and settings commands",
  );
  console.log("\n=== stable row and storage identity ===");
  assert(
    rowIdForEntry(4, fake("one.txt", 0)) === "4:/fake/one.txt",
    "a row id follows the entry path rather than its list position",
  );
  assert(
    rowIdForEntry(4, fake("two.txt", 0)) !==
      rowIdForEntry(4, fake("one.txt", 0)),
    "two paths in one result generation have different row ids",
  );

  const identityRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "file-search-identity-"),
  );
  try {
    const target = path.join(identityRoot, "target");
    const alias = path.join(identityRoot, "alias");
    fs.mkdirSync(target);
    fs.symlinkSync(target, alias);
    const realTarget = fs.realpathSync(target);

    const fromStat = statEntry(alias);
    assert(
      fromStat?.isSymlink === true,
      "statEntry preserves that an entry is a symlink",
    );
    assert(
      fromStat !== undefined && entryStoragePath(fromStat) === realTarget,
      "a symlink uses its resolved target for visits and pins",
    );

    const fromListing = readDirectory(identityRoot, false).entries.find(
      (entry) => entry.path === alias,
    );
    assert(
      fromListing !== undefined && entryStoragePath(fromListing) === realTarget,
      "directory listings give a symlink the same storage key",
    );
  } finally {
    fs.rmSync(identityRoot, { recursive: true, force: true });
  }

  console.log("\n=== path-aware matching (from fuzzy-file-search) ===");
  const deepPath =
    "/Users/u/Library/CloudStorage/GoogleDrive-a/My Drive/alpha/beta/Widget Notes";
  const nested = "/Users/x/recipes/dinner.pdf";
  assert(
    matchPath(parseQuery("widget"), deepPath, true) === MATCH.PREFIX,
    "single token still grades on the name",
  );
  assert(
    matchPath(parseQuery("alpha widget"), deepPath, true) === MATCH.PREFIX,
    '"alpha widget" ranks by the name, constrained by the folder',
  );
  assert(
    matchPath(parseQuery("widget alpha"), deepPath, true) ===
      MATCH.PREFIX + ORDER_PENALTY,
    "reversed order still matches, but ranks below the in-order form (zoxide rule 2/3)",
  );
  assert(
    matchPath(parseQuery("alpha"), deepPath, true) === MATCH.PATH,
    "a folder-only match is a lower tier than a name match",
  );
  assert(
    matchPath(parseQuery("alpha nonsense"), deepPath, true) === undefined,
    "every token must appear somewhere",
  );
  assert(
    matchPath(parseQuery("rec din pdf"), nested, false) !== undefined,
    '"rec din pdf" finds ~/recipes/dinner.pdf: a partial of each path component',
  );
  assert(
    matchPath(parseQuery("recipesdinner"), nested, false) === MATCH.PATH_FUZZY,
    "spaces-removed subsequence over the whole path is the last resort",
  );
  // Whole-path subsequences must remain tightly bounded.
  const longNoise =
    "/Users/u/Library/CloudStorage/GoogleDrive-user@example.com/.shortcut-targets-by-id/example-id/Shared Folder/Committee Papers";
  assert(
    matchPath(parseQuery("bootcamp"), longNoise, true) === undefined,
    "letters scattered across a long path are not a match",
  );
  assert(
    matchPath(
      parseQuery("bootcamp"),
      "/x/Meetings/Onboarding bootcamp",
      true,
    ) === MATCH.WORD_PREFIX,
    "…while the real folder is still a word-prefix match",
  );
  assert(
    matchPath(parseQuery("sharedfolder"), longNoise, true) === MATCH.PATH_FUZZY,
    "…and a subsequence that sits inside a tight span still reaches the path tier",
  );
  assert(
    matchPath(parseQuery("zzzqqq"), longNoise, true) === undefined,
    "letters absent from the path match nothing at all",
  );

  console.log("\n=== zoxide query rules ===");
  const fooBar = "/foo/bar";
  assert(
    matchPath(parseQuery("FOO"), fooBar, true) !== undefined,
    "rule 1: matching is case-insensitive",
  );
  const inOrder = matchPath(parseQuery("fo ba"), fooBar, true);
  const reversed = matchPath(parseQuery("ba fo"), fooBar, true);
  assert(inOrder !== undefined, "rule 2: `fo ba` matches /foo/bar");
  assert(
    reversed !== undefined && (inOrder as number) < (reversed as number),
    "rule 2: `ba fo` ranks strictly below `fo ba` rather than being rejected",
  );
  assert(
    matchPath(parseQuery("fo / ba"), fooBar, true) !== undefined,
    "rule 2: `fo / ba` matches /foo/bar",
  );
  assert(
    (matchPath(parseQuery("fo / ba"), "/foobar", false) ?? 99) >= ORDER_PENALTY,
    "rule 2: the slash is significant, so /foobar does not get the in-order tier",
  );
  const barFoo = "/bar/foo";
  assert(
    (matchPath(parseQuery("bar"), fooBar, true) as number) <
      (matchPath(parseQuery("bar"), barFoo, true) as number),
    "rule 3: `bar` prefers /foo/bar over /bar/foo",
  );
  assert(
    (matchPath(parseQuery("foo/bar"), fooBar, true) as number) <
      (matchPath(parseQuery("foo/bar"), "/foo/bar/baz", true) as number),
    "rule 3: `foo/bar` prefers /foo/bar over /foo/bar/baz",
  );

  console.log("\n=== type directives ===");
  assert(
    parseQuery("-d widget").type === "directory",
    "-d restricts to folders",
  );
  assert(
    parseQuery("widget -f").type === "file",
    "-f restricts to files, in any position",
  );
  assert(
    parseQuery("-d widget").tokens.join(" ") === "widget",
    "the directive is not treated as a search term",
  );
  assert(
    parseQuery("widget").type === "all",
    "no directive means no restriction",
  );
  assert(
    matchPath(parseQuery("-d widget"), deepPath, true) !== undefined,
    "-d keeps a folder",
  );
  assert(
    matchPath(parseQuery("-d widget"), deepPath, false) === undefined,
    "-d drops a file",
  );
  assert(
    matchPath(parseQuery("-f widget"), deepPath, true) === undefined,
    "-f drops a folder",
  );
  assert(
    parseQuery("alp widget").longest === "widget",
    "the longest token is the one the length policy is measured against",
  );

  // Partial directives must not become search terms while typing.
  assert(parseQuery("widget -d").type === "directory", "-d works at the end");
  assert(parseQuery("-d widget").type === "directory", "-d works at the start");
  assert(
    parseQuery("widget -folder").type === "directory",
    "long spellings work at the end too",
  );
  assert(
    parseQuery("widget -").tokens.join() === "widget",
    "a lone dash is a directive being typed, not a search term",
  );
  assert(
    parseQuery("widget -di").tokens.join() === "widget",
    "a half-typed directive is skipped",
  );
  assert(
    parseQuery("widget ext:").tokens.join() === "widget",
    "a filter keyword with no value yet is skipped",
  );
  assert(
    parseQuery("widget size:>").tokens.join() === "widget",
    "an incomplete size bound is skipped",
  );
  assert(
    parseQuery("widget after:nonsense").tokens.join() === "widget",
    "an unparseable date is skipped, not searched for",
  );
  assert(
    parseQuery("widget -x").tokens.join() === "widget,-x",
    "a dash term that is not a directive prefix stays a search term",
  );
  assert(
    parseQuery("widget -").hasFilters === false,
    "a directive being typed does not yet count as a filter",
  );
  assert(
    parseQuery("alpha widget").longest === "widget",
    "on a length tie the later token wins, matching folder-then-name typing",
  );

  console.log("\n=== exponential moving sum on an event clock (from ze) ===");
  // Compare stale high-frequency usage with recent repeated usage.
  let log: VisitLog = { tick: 0, items: {} };
  for (let i = 0; i < 200; i++) log = recordEms(log, "/old", 0);
  for (let i = 0; i < 800; i++) log = recordEms(log, "/filler", 0); // time passes
  for (let i = 0; i < 6; i++) log = recordEms(log, "/hot", 0);
  log = recordEms(log, "/old", 0); // One recent revisit after many stale opens.

  const oldScore = emsScore(log.items["/old"], log.tick);
  const hotScore = emsScore(log.items["/hot"], log.tick);
  assert(
    hotScore > oldScore,
    `the recently-used item outranks the ancient heavyweight (${hotScore.toFixed(2)} vs ${oldScore.toFixed(2)})`,
  );
  assert(
    log.items["/old"].count === 201,
    "the raw count still records all 201 opens; it just no longer drives the ranking",
  );

  // Baseline count-by-recency formula for the same event stream.
  const stickyOld = Math.log2(1 + 201) * 1.0; // count x decay(last visit = now)
  const stickyHot = Math.log2(1 + 6) * 1.0;
  assert(
    stickyOld > stickyHot,
    "the old formula really did rank the stale item first",
  );
  console.log("  same data, both formulas:");
  console.log(
    `    count x recency: /old ${stickyOld.toFixed(2)} vs /hot ${stickyHot.toFixed(2)}  <- backwards`,
  );
  console.log(
    `    EMS:             /old ${oldScore.toFixed(2)} vs /hot ${hotScore.toFixed(2)}`,
  );

  console.log("\n=== a malformed entry cannot poison the ranking ===");
  const legacyShaped = { count: 7, lastVisit: Date.now() } as unknown as Visit;
  const recovered = emsScore(legacyShaped, 0);
  assert(
    Number.isFinite(recovered) && recovered > 0,
    `an entry with no ems falls back to its count instead of returning NaN (${recovered})`,
  );

  console.log("\n=== the event clock stands still while you are away ===");
  const parked: VisitLog = {
    tick: 50,
    items: { "/x": { count: 5, lastVisit: 0, ems: 4, tick: 50 } },
  };
  assert(emsScore(parked.items["/x"], 50) === 4, "no ticks elapsed, no decay");
  assert(
    emsScore(parked.items["/x"], 50) ===
      emsScore(parked.items["/x"], parked.tick),
    "a month of not using the extension costs nothing, unlike wall-clock decay",
  );
  const later = emsScore(parked.items["/x"], 50 + Math.LN2 / LAMBDA);
  assert(
    Math.abs(later - 2) < 0.01,
    `one half-life of *actions* halves the score (${later.toFixed(3)})`,
  );

  console.log("\n=== bounded by construction ===");
  let saturated: VisitLog = { tick: 0, items: {} };
  for (let i = 0; i < 5000; i++) saturated = recordEms(saturated, "/same", 0);
  const peak = emsScore(saturated.items["/same"], saturated.tick);
  assert(
    peak <= MAX_EMS + 0.001,
    `even 5,000 opens converge to 1/(1-exp(-lambda)) = ${MAX_EMS.toFixed(1)}, reaching ${peak.toFixed(1)}`,
  );

  console.log("\n=== pruning bounds storage, not scores ===");
  let sparse: VisitLog = { tick: 0, items: {} };
  sparse = recordEms(sparse, "/kept", 0);
  for (let i = 0; i < 3000; i++) sparse = recordEms(sparse, "/churn", 0);
  const prunedResult = pruneVisits(sparse);
  assert(
    prunedResult.log.items["/kept"] === undefined,
    "an entry decayed below the floor is dropped",
  );
  assert(prunedResult.pruned > 0, "pruning reports what it removed");

  console.log("\n=== learned abbreviations (from LaunchBar) ===");
  let abbrevs = mergeAbbreviation({}, "wn", "/x/Widget Notes");
  assert(
    abbrevs["wn"]["/x/Widget Notes"] === 1,
    "a pairing is recorded under what you typed",
  );
  abbrevs = mergeAbbreviation(abbrevs, "wn", "/x/Widget Notes");
  assert(
    abbrevs["wn"]["/x/Widget Notes"] === 2,
    "repeating it reinforces the pairing",
  );
  abbrevs = mergeAbbreviation(abbrevs, "wn", "/x/Other Thing");
  assert(
    Object.keys(abbrevs["wn"]).length === 2,
    "a query can point at more than one item",
  );
  for (let i = 0; i < 10; i++)
    abbrevs = mergeAbbreviation(abbrevs, "wn", `/x/f${i}`);
  assert(
    Object.keys(abbrevs["wn"]).length === MAX_PER_ABBREVIATION,
    `items per query are capped at ${MAX_PER_ABBREVIATION}`,
  );
  assert(
    mergeAbbreviation({}, "", "/x/y")[""] === undefined,
    "an empty query learns nothing",
  );
  assert(
    MATCH.LEARNED < MATCH.PREFIX,
    "a learned pairing outranks even an exact name prefix",
  );

  console.log("\n=== positional match quality (from fzf) ===");
  const qWordStart = matchQuality("widget", "Widget Notes 2026");
  const qMidWord = matchQuality("widget", "memo-about-thewidget-stuff.txt");
  assert(
    qWordStart > qMidWord,
    `a word-start match scores higher (${qWordStart.toFixed(2)} vs ${qMidWord.toFixed(2)})`,
  );
  const qRun = matchQuality("abc", "abc.txt");
  const qScattered = matchQuality("abc", "a-b-c.txt");
  assert(
    qRun > qScattered,
    `consecutive beats scattered (${qRun.toFixed(2)} vs ${qScattered.toFixed(2)})`,
  );
  assert(matchQuality("zzz", "widget") === 0, "a non-match scores zero");
  assert(qWordStart <= 1 && qWordStart >= 0, "quality stays in 0..1");

  console.log("\n=== the search-state signals agree with each other ===");
  const settled: Progress = {
    memory: "done",
    folder: "done",
    index: "done",
    ranking: "done",
  };
  assert(isSettled(settled), "everything done is settled");
  assert(statusLight(settled) === "🟢", "settled shows the green light");
  assert(describeProgress(settled) === "complete", "and collapses to one word");

  assert(
    isSettled({ ...settled, index: "skipped", folder: "skipped" }),
    "a skipped stage does not hold the list open",
  );

  /*
   * Which stages hold the rows back.
   *
   * `rowsCanChange` gates both the rendered rows and the selection request, so
   * it has to be narrower than an unsettled list: a `waiting` index is one that
   * will not be queried for this query at all, and treating that as pending
   * would hold a one-character query's memory results forever.
   */
  assert(!rowsCanChange(settled), "a finished list is not still changing");
  for (const stage of ["memory", "folder", "index", "ranking"] as const)
    assert(
      rowsCanChange({ ...settled, [stage]: "running" }),
      `a running ${stage} stage can still reorder the rows`,
    );
  assert(
    !rowsCanChange({ ...settled, index: "waiting" }),
    "an index waiting for more characters will not run, so the rows are final",
  );
  for (const value of ["skipped", "partial", "failed"] as const)
    assert(
      !rowsCanChange({ ...settled, folder: value }),
      `a ${value} stage cannot reorder anything either`,
    );

  // Every unfinished stage must keep progress unsettled.
  for (const stage of ["memory", "folder", "index", "ranking"] as const) {
    for (const value of ["running", "waiting"] as const) {
      const p: Progress = { ...settled, [stage]: value };
      assert(!isSettled(p), `${stage} ${value} is not settled`);
      assert(statusLight(p) === "🟡", `${stage} ${value} shows yellow`);
      assert(
        describeProgress(p) !== "complete",
        `${stage} ${value} never says complete`,
      );
    }
  }

  const base = {
    rankingReady: true,
    backgroundPending: false,
    scoped: false,
    folderMetaPending: false,
    isPathQuery: false,
    query: "proj",
    isHiddenOnly: false,
    searching: false,
    termLength: 3,
    minQuery: 3,
    rankingPending: false,
  };
  assert(
    isSettled(deriveProgress(base)),
    "a finished whole-disk search settles",
  );
  assert(
    deriveProgress({ ...base, searching: true }).index === "running",
    "an in-flight pass reads running",
  );
  assert(
    deriveProgress({ ...base, termLength: 1 }).index === "waiting" &&
      deriveProgress({ ...base, termLength: 1 }).needed === 2,
    "a short term waits, and says how much is missing",
  );
  assert(
    deriveProgress({ ...base, query: "" }).index === "skipped",
    "an empty query skips the index rather than waiting on it",
  );
  assert(
    deriveProgress({ ...base, isPathQuery: true }).index === "skipped",
    "the path bar skips the index",
  );
  const directFolder = deriveProgress({
    ...base,
    scoped: true,
    directChildrenOnly: true,
    query: "c",
    termLength: 1,
    folderMetaPending: true,
  });
  assert(
    directFolder.index === "skipped" &&
      directFolder.needed === undefined &&
      directFolder.folder === "running",
    "short folder queries report direct-child metadata work without waiting for the index",
  );
  // A hidden-only query skips the index.
  const bare = deriveProgress({
    ...base,
    query: ".",
    isHiddenOnly: true,
    termLength: 0,
  });
  assert(
    bare.index === "skipped" && bare.needed === undefined,
    "a hidden-only query skips the index instead of asking for more characters",
  );
  assert(isSettled(bare), "and settles, because nothing is pending");
  assert(
    deriveProgress({ ...base, scoped: true, folderMetaPending: true })
      .folder === "running",
    "reading the folder in scope is its own stage",
  );
  assert(
    deriveProgress({ ...base, scoped: false }).folder === "skipped",
    "and does not apply to a whole-disk search",
  );
  assert(
    deriveProgress({ ...base, rankingReady: false }).memory === "running",
    "memory is running until the usage history has loaded",
  );
  assert(
    deriveProgress({ ...base, backgroundPending: true }).memory === "running",
    "memory stays pending while cached indexes are still loading",
  );
  const recentPartial = deriveProgress({ ...base, memoryPartial: true });
  assert(
    recentPartial.memory === "partial" && statusLight(recentPartial) === "🟠",
    "timed-out recent-file validation reports a partial memory stage",
  );
  const failedSearch = deriveProgress({ ...base, searchFailed: true });
  assert(
    isSettled(failedSearch) && statusLight(failedSearch) === "🔴",
    "a failed index search settles with a red status instead of green",
  );
  const failedPathListing = deriveProgress({
    ...base,
    isPathQuery: true,
    folderFailed: true,
  });
  assert(
    failedPathListing.folder === "failed" &&
      failedPathListing.index === "skipped" &&
      statusLight(failedPathListing) === "🔴" &&
      !describeProgress(failedPathListing).includes("index failed"),
    "an unreadable path-bar location is attributed to the folder stage",
  );
  const failedFolder = deriveProgress({
    ...base,
    scoped: true,
    folderFailed: true,
  });
  assert(
    isSettled(failedFolder) && statusLight(failedFolder) === "🔴",
    "an unreadable folder settles with a red status instead of green",
  );
  assert(
    deriveProgress({ ...base, rankingPending: true }).ranking === "running",
    "the mdls pass over the results is the last stage",
  );
  const failedRanking = deriveProgress({ ...base, rankingFailed: true });
  assert(
    failedRanking.ranking === "failed" && statusLight(failedRanking) === "🔴",
    "failed usage enrichment ends red instead of green",
  );
  const partialRanking = deriveProgress({ ...base, rankingPartial: true });
  assert(
    partialRanking.ranking === "partial" &&
      isSettled(partialRanking) &&
      statusLight(partialRanking) === "🟠" &&
      describeProgress(partialRanking).includes("ranking partial"),
    "timed-out usage enrichment settles with an orange partial status",
  );
  assert(
    deriveProgress({ ...base, termLength: 2, minQuery: 3 }).needed === 1,
    "needed counts characters, not tokens",
  );

  const mid: Progress = {
    memory: "done",
    folder: "skipped",
    index: "running",
    ranking: "done",
  };
  assert(
    describeProgress(mid) === "memory ✓ · index … · ranking ✓",
    `named stages, skipping what does not apply (${describeProgress(mid)})`,
  );
  const short: Progress = {
    memory: "done",
    folder: "skipped",
    index: "waiting",
    ranking: "done",
    needed: 2,
  };
  assert(
    describeProgress(short).includes("index needs 2 more"),
    `a wait says what it is waiting for (${describeProgress(short)})`,
  );

  console.log("\n=== matching inside a hidden folder ===");
  // Hidden entries are in the index; index-checks covers the showHidden filter.
  // What matters here is how a dotted query ranks once the rows come back.
  const dotted = parseQuery(".tool skills");
  assert(
    matchPath(dotted, path.join("/example", ".tool", "skills")) ===
      MATCH.PREFIX,
    "a dotted query ranks top when its last term matches the last component",
  );
  assert(
    matchPath(dotted, path.join("/example", ".tool", "skills", "one.md")) !==
      undefined,
    "and a file inside that folder still matches on the path",
  );
  assert(
    matchPath(dotted, path.join("/example", "visible", "skills")) === undefined,
    "a folder without the dotted component does not match",
  );

  console.log("\n=== ext: accepts what people actually type ===");
  const multi = parseQuery("proj ext:cu,h");
  assert(
    multi.extensions.join(",") === "cu,h",
    `comma-separated extensions split (${JSON.stringify(multi.extensions)})`,
  );
  assert(
    matchPath(multi, "/x/proj/layer.cu", false) !== undefined &&
      matchPath(multi, "/x/proj/common.h", false) !== undefined,
    "both of a comma-separated pair match",
  );
  assert(
    matchPath(multi, "/x/proj/notes.md", false) === undefined,
    "and nothing else does",
  );
  assert(
    parseQuery("a ext:cu ext:h").extensions.join(",") === "cu,h",
    "repeating the filter still works",
  );
  const tarball = parseQuery("backup ext:tar.gz");
  assert(
    matchPath(tarball, "/x/backup.tar.gz", false) !== undefined,
    "a two-part extension matches, which path.extname could not do",
  );
  assert(
    matchPath(parseQuery("run ext:h"), "/x/run.sh", false) === undefined,
    "a suffix test is no looser: ext:h does not match run.sh",
  );
  assert(
    matchPath(parseQuery("x ext:gz"), "/x/x.tar.gz", false) !== undefined,
    "the last part still matches on its own",
  );
  assert(
    parseQuery("a ext:").extensions.length === 0,
    "a half-typed ext: adds nothing",
  );

  console.log("\n=== a file-only filter needs no folder expansion ===");
  // Spotlight answered a query like "proj ext:cu" with the folder alone, so it
  // extension had to list the folder to find the file. Every indexed file is
  // its own row, so the filter runs in SQL against the file. index-checks
  // asserts the SQL side; this asserts that the parse still rules folders out.
  assert(
    parseQuery("proj ext:cu").extensions.join(",") === "cu",
    "an extension filter survives alongside a term",
  );
  assert(
    matchPath(
      parseQuery("proj ext:cu"),
      "/example/proj/code/layer.cu",
      false,
    ) !== undefined,
    "the file inside the folder is what matches",
  );
  assert(
    matchPath(parseQuery("proj ext:cu"), "/example/proj", false) === undefined,
    "the folder itself does not",
  );

  console.log("\n=== partial usage metadata cache ===");
  const cachedUsage = new Map([["/x/one", { useCount: 2 }]]);
  assert(
    missingUsagePaths(["/x/one", "/x/two"], cachedUsage).join(",") === "/x/two",
    "a partially cached folder remains pending until missing metadata is read",
  );

  console.log("\n=== a leading dot asks for hidden entries ===");
  const bareDot = parseQuery(".");
  assert(bareDot.hidden, "a bare dot sets the hidden flag");
  assert(
    bareDot.tokens.length === 0,
    "a bare dot is not kept as a search term",
  );
  assert(
    hiddenOnly(bareDot),
    "a bare dot means hidden entries and nothing else",
  );
  assert(
    matchPath(bareDot, "/Users/foo/.ssh", true) !== undefined,
    "a bare dot matches a hidden folder",
  );
  assert(
    matchPath(bareDot, "/Users/foo/Documents/report.pdf", false) === undefined,
    "a bare dot does not match an ordinary file, despite the dot in its extension",
  );
  const dotTerm = parseQuery(".ssh");
  assert(dotTerm.hidden, "a dotted term sets the hidden flag");
  assert(
    dotTerm.tokens.join(",") === ".ssh",
    "a dotted term is kept, since it is a real prefix of a real name",
  );
  assert(!hiddenOnly(dotTerm), "a dotted term narrows on its own");
  assert(
    matchPath(dotTerm, "/Users/foo/.ssh/config", false) !== undefined,
    "a dotted term reaches inside a hidden folder",
  );
  const dottedName = parseQuery("index.html");
  assert(
    !dottedName.hidden,
    "a dot inside a word is part of the name, not a request for hidden entries",
  );
  const dotWithDirective = parseQuery("-d .");
  assert(
    hiddenOnly(dotWithDirective) && dotWithDirective.type === "directory",
    "a bare dot combines with -d to list hidden folders only",
  );
  assert(
    matchPath(dotWithDirective, "/Users/foo/.ssh", false) === undefined,
    "-d with a bare dot excludes hidden files",
  );

  console.log("\n=== attribute filters (from Everything / Alfred) ===");
  const pdfOnly = parseQuery("widget ext:pdf");
  assert(
    pdfOnly.extensions.join() === "pdf" && pdfOnly.tokens.join() === "widget",
    "ext: is a filter, not a search term",
  );
  assert(
    matchPath(pdfOnly, "/x/Widget budget.pdf", false) !== undefined,
    "ext:pdf keeps a pdf",
  );
  assert(
    matchPath(pdfOnly, "/x/Widget budget.doc", false) === undefined,
    "ext:pdf drops a doc",
  );
  const recent = parseQuery("widget after:2026-01");
  assert(recent.after !== undefined, "after: parses a year-month");
  assert(
    parseQuery("after:2026-13-01").after === undefined,
    "an invalid month is not rolled into the following year",
  );
  assert(
    parseQuery("before:2026-02-30").before === undefined,
    "an invalid day is not rolled into the following month",
  );
  const stats2026 = {
    mtimeMs: Date.UTC(2026, 5, 1),
    size: 100,
    isDirectory: false,
  };
  const stats2020 = {
    mtimeMs: Date.UTC(2020, 5, 1),
    size: 100,
    isDirectory: false,
  };
  assert(matchesStats(recent, stats2026), "after: keeps a newer file");
  assert(!matchesStats(recent, stats2020), "after: drops an older file");
  const bigFiles = parseQuery("size:>10mb");
  assert(bigFiles.minSize === 10 * 1024 ** 2, "size units are parsed (10mb)");
  assert(
    matchesStats(bigFiles, {
      mtimeMs: 0,
      size: 20 * 1024 ** 2,
      isDirectory: false,
    }),
    "size:>10mb keeps a 20MB file",
  );
  assert(
    !matchesStats(bigFiles, { mtimeMs: 0, size: 1024, isDirectory: false }),
    "size:>10mb drops a 1KB file",
  );
  assert(
    !matchesStats(bigFiles, { mtimeMs: 0, size: 0, isDirectory: true }),
    "a size bound excludes folders, where size is meaningless",
  );
  assert(
    parseQuery("widget").hasFilters === false,
    "a plain query has no filters",
  );

  console.log("\n=== the type filter is two-phase ===");
  const dirQuery = parseQuery("-d widget");
  assert(
    matchPath(dirQuery, deepPath) !== undefined,
    "phase 1 (no stat yet) deliberately ignores the type filter",
  );
  assert(
    matchPath(dirQuery, deepPath, false) === undefined,
    "phase 2 (after stat) applies it",
  );
  // Build the shortlist from entries that survive type filtering.
  const mixed = [
    "/x/Widget notes.pdf",
    "/x/Widget budget.doc",
    "/x/Widget Notes",
  ];
  const takeThenFilter = mixed
    .slice(0, 2)
    .filter((p) => matchPath(dirQuery, p, !p.includes(".")) !== undefined);
  const filterWhileTaking: string[] = [];
  for (const p of mixed) {
    if (filterWhileTaking.length >= 2) break;
    if (matchPath(dirQuery, p, !p.includes(".")) === undefined) continue;
    filterWhileTaking.push(p);
  }
  assert(
    takeThenFilter.length === 0,
    "take-then-filter loses everything (the bug)",
  );
  assert(
    filterWhileTaking.length === 1,
    "filter-while-taking finds the folder (the fix)",
  );

  console.log("\n=== match quality outranks usage ===");
  const hot = fake("budget.xlsx", 0);
  const cold = fake("report.pdf", 400);
  const visits: Visits = {
    "/fake/budget.xlsx": { count: 50, lastVisit: Date.now() },
  };
  assert(
    rank([hot, cold], visits, "")[0].entry.name === "budget.xlsx",
    "no query: the heavily-used file leads",
  );
  assert(
    rank([hot, cold], visits, "rep")[0].entry.name === "report.pdf",
    "typing 'rep' pulls the cold file above it",
  );

  console.log(
    "\n=== fresh file vs stale-but-visited (the useFrecencySorting trap) ===",
  );
  // One open followed by eight half-lives of event-clock decay.
  const staleVisit: Visit = {
    count: 1,
    lastVisit: Date.now() - 180 * DAY,
    ems: 1,
    tick: -8 * 120,
  };
  const old = fake("old.txt", 180);
  const fresh = fake("new.txt", 0.0014); // ~2 minutes
  const blended = rank(
    [old, fresh],
    { "/fake/old.txt": staleVisit },
    "",
    undefined,
    0,
  );
  assert(
    blended[0].entry.name === "new.txt",
    "a file saved 2 min ago beats one opened once 6 months ago",
  );
  console.log(
    `        new.txt ${blended.find((r) => r.entry.name === "new.txt")!.score.total.toFixed(1)}` +
      ` vs old.txt ${blended.find((r) => r.entry.name === "old.txt")!.score.total.toFixed(1)}`,
  );

  console.log("\n=== frequency saturates ===");
  const once = fake("once.txt", 30);
  const often = fake("often.txt", 30);
  const r2 = rank(
    [once, often],
    {
      "/fake/once.txt": { count: 2, lastVisit: Date.now(), ems: 2, tick: 0 },
      "/fake/often.txt": {
        count: 200,
        lastVisit: Date.now(),
        ems: 200,
        tick: 0,
      },
    },
    "",
    undefined,
    0,
  );
  const ratio = r2[0].score.visit / r2[1].score.visit;
  assert(
    ratio > 1 && ratio < 7,
    `100x the accumulated sum is only ${ratio.toFixed(1)}x the score, so one hot file cannot bury the list`,
  );

  console.log("\n=== noise filtering ===");
  const home = os.homedir();
  assert(
    isNoisyPath(`${home}/Library/Logs/SomeApp/app.log`, home, false),
    "~/Library is filtered out of recursive results",
  );
  assert(
    isNoisyPath(`${home}/x/node_modules/widget/index.js`, home, false),
    "node_modules is filtered",
  );
  assert(
    isNoisyPath(`${home}/.cache/widget/x`, home, false),
    "dot-directories are filtered when hidden files are off",
  );
  assert(
    !isNoisyPath(`${home}/.cache/widget/x`, home, true),
    "…but kept when the user asks for hidden files",
  );
  assert(
    !isNoisyPath(`${home}/Documents/Some Folder`, home, false),
    "an ordinary nested folder survives",
  );
  assert(
    !isNoisyPath(`${home}/x/node_modules`, home, false),
    "a folder literally named node_modules is a legitimate hit",
  );
  assert(
    relativeDepth(home, `${home}/Some Folder`) === 0,
    "a direct child is depth 0",
  );
  assert(
    relativeDepth(home, `${home}/Documents/Some Folder`) === 1,
    "a grandchild is depth 1",
  );
  assert(
    relativeDepth(home, `${home}/..notes/item.txt`) === 1,
    "a name beginning with two dots is still inside the root",
  );
  assert(
    isNoisyPath(`${home}/..notes/item.txt`, home, false),
    "a hidden two-dot-prefixed folder still follows hidden-file filtering",
  );

  console.log("\n=== cloud storage is not noise ===");
  const cloudPath = `${home}/Library/CloudStorage/GoogleDrive-user@example.com/My Drive/foo/bar`;
  assert(
    !isNoisyPath(cloudPath, home, false),
    "Library/CloudStorage survives the filter",
  );
  assert(
    !isNoisyPath(
      `${home}/Library/Mobile Documents/com~apple~CloudDocs/paper.tex`,
      home,
      false,
    ),
    "Library/Mobile Documents (iCloud Drive) survives",
  );
  assert(
    isNoisyPath(`${home}/Library/Logs/SomeApp/x.log`, home, false),
    "the rest of Library is still filtered",
  );
  assert(
    isNoisyPath(
      `${home}/Library/CloudStorage/GoogleDrive-x/node_modules/a/b.js`,
      home,
      false,
    ),
    "noise nested inside a cloud drive is still filtered",
  );

  console.log("\n=== path bar syntax ===");
  assert(
    splitPathQuery("report.pdf") === undefined,
    "an ordinary word is not a path",
  );
  assert(splitPathQuery("~")?.dir === home, "~ lists the home folder");
  assert(
    splitPathQuery("~another-user") === undefined,
    "a tilde-prefixed name is not treated as a home-relative path",
  );
  assert(
    splitPathQuery("/tmp/foo/Doc")?.prefix === "Doc",
    "a partial name becomes the match prefix",
  );
  assert(
    splitPathQuery("/tmp/foo/bar/")?.dir === "/tmp/foo/bar",
    "a trailing slash lists that folder",
  );
  assert(splitPathQuery("/")?.dir === "/", "the filesystem root is reachable");

  if (!live) {
    finish();
    return;
  }

  console.log("\n=== detected places ===");
  // The same discovery the start screen runs: fixed local candidates plus a
  // bounded read of the CloudStorage root.
  const cloudDiscovery = await cloudPathCandidates(
    new AbortController().signal,
  );
  const places = [...standardPathCandidates(), ...cloudDiscovery.paths];
  const cloudPlaces = places.filter((p) => p.path.includes("/CloudStorage/"));
  assert(
    places.some((p) => p.path === home),
    "Home is offered as a start folder",
  );
  assert(
    cloudPlaces.length > 0,
    `cloud drives are auto-detected (${cloudPlaces.length} found)`,
  );
  console.log(
    `    ${places.length} places, ${cloudPlaces.length} of them cloud drives`,
  );

  console.log("\n=== Google Drive shared folders (invisible to Spotlight) ===");
  const shared = sharedCloudFolders();
  assert(
    shared.length > 0,
    `shared folders enumerated directly (${shared.length} found)`,
  );
  assert(
    shared.every((f) => f.path.includes("/.shortcut-targets-by-id/")),
    "all of them live behind a shortcut target",
  );
  if (shared.length > 0) {
    assert(
      locationLabel(shared[0].path).startsWith("shared folder · "),
      "the shared-folder label hides the raw shortcut id",
    );
  }

  console.log("\n=== building a bounded index over a real Drive ===");
  // A full crawl takes half a minute and hundreds of megabytes. This builds a
  // capped index against real fd, a real mount, and real SQLite, which is
  // enough to check that the pieces work together on this machine.
  const fdLookup = findFd();
  const driveRoots = await googleDriveIndexRoots();
  const probeIndex = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "index-probe-")),
    "files.sqlite",
  );
  let indexBuilt = false;
  if (fdLookup.kind !== "found") {
    console.log(`  (${describeFdLookup(fdLookup)}, index checks skipped)`);
  } else if (driveRoots.length === 0) {
    console.log("  (no locally mounted Google Drive, index checks skipped)");
  } else {
    const started = Date.now();
    const built = await rebuildIndex({
      file: probeIndex,
      withLock: (work) => work(() => {}),
      roots: [driveRoots[0]],
      maxEntries: 40_000,
      budgetMs: 120_000,
    });
    const elapsed = Date.now() - started;
    indexBuilt = built.kind === "done";
    if (built.kind === "done") {
      console.log(`  ${built.summary} (${elapsed}ms wall clock)`);
      assert(
        built.report.indexed > 0,
        `real fd crawl indexed ${built.report.indexed} of ${built.report.scanned} scanned`,
      );
      assert(
        built.report.indexed <= 40_000,
        "the entry cap is honoured against a real mount",
      );
      assert(
        !built.report.complete,
        "a capped scan reports itself incomplete, so stale rows are kept",
      );
    } else {
      console.log(`  index build did not run: ${built.message}`);
      assert(false, "the bounded index build succeeds on this machine");
    }
  }

  const indexed = (query: string, showHidden = false) =>
    searchIndex(probeIndex, parseQuery(query), { showHidden, limit: 500 });

  if (indexBuilt) {
    console.log("\n=== querying what Spotlight could not see ===");
    const sharedInDrive = shared.find((f) => f.path.startsWith(driveRoots[0]));
    const sampled = sharedInDrive
      ? readDirectory(sharedInDrive.path, false).entries[0]
      : undefined;
    if (sampled) {
      const token = sampled.name.split(/[\s._-]/)[0] || sampled.name;
      const t = performance.now();
      const hit = indexed(token);
      const ms = performance.now() - t;
      assert(
        hit.status === "ready",
        `the index answers in ${ms.toFixed(2)}ms (${hit.entries.length} rows)`,
      );
      console.log(
        `  a name from inside a shared folder returned ${hit.entries.length} rows in ${ms.toFixed(2)}ms`,
      );
    } else {
      console.log("  (no shared folder with contents inside that Drive)");
    }
  }

  console.log("\n=== shortcuts, as the index records them ===");
  // The index records a symlink with its visible path and its resolved target,
  // which is what the separate shortcut scan used to provide.
  let indexedLink: { path: string; storagePath?: string } | undefined;
  if (indexBuilt) {
    const linkReader = openIndexForRead(probeIndex);
    if (linkReader.kind === "opened") {
      indexedLink = linkReader.db
        .prepare(
          `SELECT path, storage_path AS storagePath FROM files
           WHERE is_symlink = 1 AND storage_path IS NOT NULL LIMIT 1`,
        )
        .get() as { path: string; storagePath?: string } | undefined;
      linkReader.db.close();
    }
    if (indexedLink) {
      assert(
        indexedLink.storagePath !== indexedLink.path,
        "a link's visible path and its resolved target are both recorded",
      );
      console.log(
        `  a shortcut is indexed under its visible name, resolving elsewhere`,
      );
    } else {
      console.log("  (no symlink in the capped index, skipped)");
    }
  }

  console.log("\n=== one folder, two routes ===");
  // Verify that a shortcut and its target resolve to one storage key.
  const viaShortcut = indexedLink?.path;
  const viaTarget = viaShortcut ? canonicalPath(viaShortcut) : undefined;
  const a = viaTarget ? statEntry(viaTarget) : undefined;
  const b = viaShortcut ? statEntry(viaShortcut) : undefined;
  if (a && b) {
    assert(a.path !== b.path, "the two routes are different path strings");
    assert(
      a.dev !== undefined && a.dev === b.dev && a.ino === b.ino,
      "both routes report the same filesystem identity",
    );
    assert(
      canonicalPath(viaShortcut as string) ===
        canonicalPath(viaTarget as string),
      "canonicalPath collapses them to one key, so usage history cannot split",
    );
  } else {
    console.log("  (no Drive shortcut on this machine, skipped)");
  }

  console.log("\n=== trailing slash paths ===");
  const withSlash = `${home}/Documents/`;
  const child = `${home}/Documents/Some Folder`;
  assert(
    path.dirname(child) !== withSlash,
    "a trailing slash breaks the direct-child test before normalization",
  );
  assert(
    path.dirname(child) === normalizeDir(withSlash),
    "normalizeDir fixes it",
  );
  assert(
    normalizeDir(`${home}/Documents`) === `${home}/Documents`,
    "an already-clean path is unchanged",
  );
  assert(
    normalizeDir("/") === "/",
    "the filesystem root survives normalization",
  );

  console.log("\n=== path bar ===");
  assert(
    splitPathQuery("report.pdf") === undefined,
    "an ordinary word is not a path",
  );
  assert(splitPathQuery("~")?.dir === home, "~ lists the home folder");
  assert(
    splitPathQuery("/tmp/foo/Doc")?.prefix === "Doc",
    "a partial name becomes the match prefix",
  );
  assert(
    splitPathQuery("/tmp/foo/bar/")?.dir === "/tmp/foo/bar",
    "a trailing slash lists that folder",
  );
  assert(splitPathQuery("/")?.dir === "/", "the filesystem root is reachable");
  // Derive a deep completion path from the current cloud drive.
  const cloudDir = cloudPlaces[0]?.path;
  const cloudChild = cloudDir
    ? readDirectory(cloudDir, false).entries.find((e) => e.isDirectory)
    : undefined;
  if (cloudChild) {
    const stem = cloudChild.name.slice(0, 3);
    const typed = `${cloudDir}/${stem}`.replace(home, "~");
    const split = splitPathQuery(typed);
    assert(split?.prefix === stem, "a long cloud path splits correctly");
    const completions = readDirectory(split?.dir ?? "", false).entries.filter(
      (e) =>
        e.isDirectory && e.name.toLowerCase().startsWith(stem.toLowerCase()),
    );
    assert(
      completions.some((e) => e.name === cloudChild.name),
      "…and completes to an existing folder inside that drive",
    );
  } else {
    console.log("  (no cloud drive with folders, completion check skipped)");
  }

  console.log("\n=== what the index covers, and what it does not ===");
  if (cloudChild) {
    assert(
      readDirectory(cloudChild.path, false).error === undefined,
      "a folder inside a cloud drive is readable",
    );
  }
  if (indexBuilt) {
    // A capped scan sees whatever fd reached first, so read the probe terms out
    // of the index itself. Guessing them from the filesystem produced terms
    // that matched nothing, and an assertion that passes on zero rows checks
    // nothing.
    const reader = openIndexForRead(probeIndex);
    const sampleNames: { name: string; depth: number }[] =
      reader.kind === "opened"
        ? (
            reader.db
              .prepare(
                `SELECT name, path FROM files
               WHERE is_dir = 0 AND length(name) >= 6 AND name NOT LIKE '.%'
               LIMIT 400`,
              )
              .all() as { name: string; path: string }[]
          ).map((row) => ({
            name: row.name,
            depth: relativeDepth(driveRoots[0], row.path),
          }))
        : [];
    if (reader.kind === "opened") reader.db.close();
    // Take a word of at least four letters, so the term is a real prefix.
    const termOf = (name: string) =>
      name.split(/[\s._\-()[\]]+/u).find((w) => /^[\p{L}]{4,}$/u.test(w));
    const probe = sampleNames.map((r) => ({ ...r, term: termOf(r.name) }));
    const anyTerm = probe.find((r) => r.term)?.term;

    if (!anyTerm) {
      console.log("  (no indexed name yielded a usable probe term, skipped)");
    } else {
      const sample = indexed(anyTerm);
      assert(
        sample.status === "ready" && sample.entries.length > 0,
        `a term taken from an indexed name comes back (${sample.entries.length} rows)`,
      );
      assert(
        sample.entries.every((e) => e.path.startsWith("/")),
        "every indexed row carries an absolute visible path",
      );
      assert(
        sample.entries.length <= 500,
        `the ranked candidate cap holds (${sample.entries.length} rows)`,
      );
      assert(
        sample.entries.every((e) =>
          e.name.toLowerCase().includes(anyTerm.toLowerCase()),
        ),
        "and every returned name really contains the term",
      );
    }

    // The index covers Google Drive only. A file elsewhere in the home folder
    // is reachable through the memory sources and through the path bar, not
    // through an indexed name query. This is the coverage limit, checked
    // rather than assumed, and checked by exact path: a MATCH probe that
    // happens to tokenize badly would report absence for the wrong reason.
    const outside = readDirectory(`${home}/Documents`, false).entries.filter(
      (entry) => !entry.isDirectory,
    );
    const offDriveReader = openIndexForRead(probeIndex);
    if (outside.length > 0 && offDriveReader.kind === "opened") {
      const lookup = offDriveReader.db.prepare(
        "SELECT 1 AS present FROM files WHERE path = ? LIMIT 1",
      );
      const present = outside.filter(
        (entry) => lookup.get(entry.path) !== undefined,
      );
      assert(
        present.length === 0,
        `the ${outside.length} file(s) under ~/Documents are absent from the index, as documented`,
      );
    } else {
      console.log("  (no file under ~/Documents to check the coverage limit)");
    }
    if (offDriveReader.kind === "opened") offDriveReader.db.close();

    // A name from several levels down answers without navigating there.
    const deep = probe.find((r) => r.term && r.depth >= 2);
    if (deep?.term) {
      const deepRow = indexed(deep.term);
      assert(
        deepRow.entries.some((e) => e.name === deep.name),
        `a name ${deep.depth + 1} levels inside the drive is answerable without navigating there (${deepRow.entries.length} rows)`,
      );
    } else {
      console.log("  (no indexed name deep enough to probe, skipped)");
    }
  }
  closeIndexReader();
  fs.rmSync(path.dirname(probeIndex), { recursive: true, force: true });

  console.log("\n=== depth penalty ===");
  const shallow: Entry = {
    ...fake("Widget Notes", 30),
    path: `${home}/a/Widget Notes`,
    isDirectory: true,
  };
  const buried: Entry = {
    ...fake("Widget Notes", 30),
    path: `${home}/a/b/c/d/Widget Notes`,
    isDirectory: true,
  };
  const byDepth = rank([buried, shallow], {}, "widget", home);
  assert(
    byDepth[0].entry.path === shallow.path,
    "with equal usage, the shallower hit wins",
  );

  console.log("\n=== ranking real nested entries ===");
  const parentWithSub = readDirectory(home, false)
    .entries.filter(
      (e) => e.isDirectory && !isNoisyPath(e.path + "/x", home, false),
    )
    .map((e) => ({
      parent: e,
      sub: readDirectory(e.path, false).entries.find((c) => c.isDirectory),
    }))
    .find((c) => c.sub !== undefined);

  // CloudStorage and Mobile Documents are allowed; other Library branches are
  // app state and stay out of results.
  const homeChildren = readDirectory(home, false).entries.map((e) => e.path);
  const libraryNoise = homeChildren.filter(
    (p) =>
      p.includes("/Library/") &&
      !/\/Library\/(CloudStorage|Mobile Documents)\//.test(p) &&
      !isNoisyPath(`${p}/x`, home, false),
  );
  assert(
    libraryNoise.length === 0,
    `no Library app-state noise survives the filter (${libraryNoise.length} leaked)`,
  );

  if (parentWithSub?.sub) {
    const subName = parentWithSub.sub.name;
    const token = subName.split(/[\s._-]/)[0] || subName;
    const siblings = readDirectory(parentWithSub.parent.path, false)
      .entries.map((e) => e.path)
      .map(statEntry)
      .filter((e): e is Entry => e !== undefined);
    const ranked = rank(siblings, {}, token, home);
    const position = ranked.findIndex(
      (r) => r.entry.path === parentWithSub.sub?.path,
    );
    assert(
      position >= 0,
      `a real nested folder ranks for its own name (position ${position + 1} of ${ranked.length})`,
    );
  } else {
    console.log("  (no two-level folder under ~, skipped)");
  }

  console.log("\n=== live directory diagnostics ===");
  const t0 = performance.now();
  const read = readDirectory(target, false);
  const tRead = performance.now() - t0;
  if (read.error) {
    console.log("  could not read the requested directory");
    process.exitCode = 1;
    return;
  }

  const t1 = performance.now();
  const meta = (await readUsageMetaResult(read.entries.map((e) => e.path)))
    .meta;
  const tMeta = performance.now() - t1;
  const enriched: Entry[] = read.entries.map((e) => ({
    ...e,
    ...(meta.get(e.path) ?? {}),
  }));

  console.log(
    `  ${read.entries.length} entries · readdir+stat ${tRead.toFixed(1)}ms · batched mdls ${tMeta.toFixed(0)}ms`,
  );
  console.log(
    `  Spotlight usage metadata present for ${meta.size}/${read.entries.length} entries`,
  );
  assert(read.entries.length > 0, "directory read returned entries");
  assert(
    [...meta.values()].every(
      (m) => m.lastUsedMs === undefined || m.lastUsedMs < Date.now() + 60_000,
    ),
    "no parsed last-used date lands in the future",
  );
  assert(
    [...meta.values()].every((m) => m.useCount === undefined || m.useCount > 0),
    "parsed use counts are positive",
  );

  // Compare batched positional metadata with a single-file read.
  const sample = enriched.filter((e) => e.useCount !== undefined).slice(0, 3);
  if (sample.length === 0) {
    console.log(
      "  (nothing in this folder carries a use count; cross-check skipped)",
    );
  } else {
    for (const s of sample) {
      const direct = execFileSync(
        "mdls",
        ["-raw", "-name", "kMDItemUseCount", s.path],
        { encoding: "utf8" },
      ).trim();
      assert(
        Number.parseInt(direct, 10) === s.useCount,
        "batched mdls parsing matches a single-file query",
      );
    }
  }

  // Compare initial mtime ordering with enriched usage ordering.
  const frame1 = rank(read.entries, {}, "");
  const frame2 = rank(enriched, {}, "");
  const moved = frame1.filter(
    (r, i) => frame2.findIndex((x) => x.entry.path === r.entry.path) !== i,
  ).length;
  console.log(
    `\n  Re-ranking when usage metadata lands: ${moved}/${frame1.length} rows change position`,
  );
  if (frame1[0] && frame2[0] && frame1[0].entry.path !== frame2[0].entry.path) {
    const nowAt =
      frame2.findIndex((x) => x.entry.path === frame1[0].entry.path) + 1;
    console.log(`  the first mtime-only row moves to position ${nowAt}`);
  }

  const alphabetical = [...enriched].sort((a, b) =>
    a.name
      .toLowerCase()
      .localeCompare(b.name.toLowerCase(), undefined, { numeric: true }),
  );
  const ranked = rank(enriched, {}, "");

  const top = 10;
  const overlap = alphabetical
    .slice(0, top)
    .filter((e) =>
      ranked.slice(0, top).some((r) => r.entry.path === e.path),
    ).length;
  console.log(
    `\n  Overlap between the two top-${top} lists: ${overlap}/${top}`,
  );

  finish();
}

function finish() {
  console.log(
    `\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`,
  );
  if (failures > 0) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error);
  console.error("\nLive diagnostics stopped because a local check failed.");
  process.exitCode = 1;
});
