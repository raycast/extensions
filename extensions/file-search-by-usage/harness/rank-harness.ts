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
import {
  canonicalPath,
  hiddenDirsMatching,
  isNoisyPath,
  isSystemPath,
  locationLabel,
  sharedCloudFolderResult,
  sharedCloudFolders,
  readDirectory,
  relativeDepth,
  normalizeDir,
  splitPathQuery,
  standardPlaces,
  statEntry,
} from "../src/lib/read-dir";
import {
  collectSearchPaths,
  readUsageMeta,
  readUsageMetaResult,
  runSpotlightSearch,
  searchPaths,
} from "../src/lib/spotlight";
import { isUnindexedScope, listUnder, walkSearch } from "../src/lib/walk";
import { googleDriveRoots, scanShortcuts } from "../src/lib/drive-shortcuts";
import { scanSharedFolders } from "../src/lib/shared-scan";
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
import { dottedTerms, excludesDirectories, hiddenOnly } from "../src/lib/query";
import {
  Progress,
  deriveProgress,
  describeProgress,
  isSettled,
  missingUsagePaths,
  statusLight,
} from "../src/lib/progress";
import { VisitLog } from "../src/lib/types";
import { Entry, Visit, Visits } from "../src/lib/types";
import { entryStoragePath, rowIdForEntry } from "../src/lib/entry-identity";
import {
  driveIndexCaveat,
  shouldReplaceIndex,
  shouldSaveCheckpoint,
} from "../src/lib/index-refresh";

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
    "a filter-only query does not start a global Spotlight search",
  );

  console.log("\n=== bounded Spotlight results ===");
  const cappedSpotlight = collectSearchPaths(
    ["/example/one", "/example/two", "/example/three"],
    { scope: "/example", max: 2 },
  );
  assert(
    cappedSpotlight.paths.join(",") === "/example/one,/example/two",
    "Spotlight keeps the requested number of usable paths",
  );
  assert(
    cappedSpotlight.truncated,
    "Spotlight reports when another usable path exists beyond the cap",
  );
  const failedSpotlight = await runSpotlightSearch("foo", {}, async () => {
    throw new Error("synthetic failure");
  });
  assert(
    failedSpotlight.error === "Spotlight search failed" &&
      failedSpotlight.paths.length === 0,
    "a Spotlight process failure is distinguishable from no matches",
  );
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

  console.log("\n=== index refresh preservation ===");
  assert(
    !shouldReplaceIndex(12, false),
    "an unavailable refresh does not replace an existing index",
  );
  assert(
    shouldReplaceIndex(12, true),
    "an available refresh can replace an existing index",
  );
  assert(
    !shouldSaveCheckpoint(12) && shouldSaveCheckpoint(0),
    "partial checkpoints cannot overwrite a useful existing index",
  );
  const syntheticCloud = fs.mkdtempSync(path.join(os.tmpdir(), "cloud-index-"));
  const missingCloud = path.join(syntheticCloud, "missing");
  assert(
    !(await googleDriveRoots(missingCloud)).available,
    "a missing cloud root is reported as unavailable",
  );
  assert(
    !sharedCloudFolderResult(missingCloud).available,
    "a missing shared-folder source is reported as unavailable",
  );
  const targetRoot = path.join(
    syntheticCloud,
    "GoogleDrive-foo@example.com",
    ".shortcut-targets-by-id",
    "123",
    "Shared Foo",
  );
  fs.mkdirSync(targetRoot, { recursive: true });
  assert(
    (await googleDriveRoots(syntheticCloud)).available,
    "an accessible Google Drive target root is available",
  );
  const syntheticShared = sharedCloudFolderResult(syntheticCloud);
  assert(
    syntheticShared.available && syntheticShared.folders.length === 1,
    "accessible shared folders are discovered from a synthetic cloud root",
  );

  const nestedDriveFolder = path.join(
    syntheticCloud,
    "GoogleDrive-foo@example.com",
    "My Drive",
    "foo",
  );
  fs.mkdirSync(nestedDriveFolder, { recursive: true });
  const depthLimitedShortcuts = await scanShortcuts({
    cloudRoot: syntheticCloud,
    maxDepth: 0,
  });
  assert(
    depthLimitedShortcuts.partial &&
      depthLimitedShortcuts.partialReason === "depth-limit",
    "a shortcut scan records when its depth bound stops it",
  );
  const timedShortcuts = await scanShortcuts({
    cloudRoot: syntheticCloud,
    budgetMs: -1,
  });
  assert(
    timedShortcuts.partial && timedShortcuts.partialReason === "time-limit",
    "a shortcut scan records when its time bound stops it",
  );

  const nestedSharedFolder = path.join(targetRoot, "nested");
  fs.mkdirSync(nestedSharedFolder, { recursive: true });
  const depthLimitedShared = await scanSharedFolders({
    cloudRoot: syntheticCloud,
    maxDepth: 0,
  });
  assert(
    depthLimitedShared.partial &&
      depthLimitedShared.partialReason === "depth-limit",
    "a shared-folder scan records when its depth bound stops it",
  );
  const itemLimitedShared = await scanSharedFolders({
    cloudRoot: syntheticCloud,
    limit: 1,
  });
  assert(
    itemLimitedShared.partial &&
      itemLimitedShared.partialReason === "item-limit",
    "a shared-folder scan records when its item bound stops it",
  );
  const timedShared = await scanSharedFolders({
    cloudRoot: syntheticCloud,
    budgetMs: -1,
  });
  assert(
    timedShared.partial && timedShared.partialReason === "time-limit",
    "a shared-folder scan records when its time bound stops it",
  );

  assert(
    driveIndexCaveat(
      { partial: true, partialReason: "depth-limit" },
      { partial: false },
    ) === "Google Drive shortcut index excludes deeper folders",
    "the shortcut depth-limit message names the actual bound",
  );
  assert(
    driveIndexCaveat(
      { partial: false },
      { partial: true, partialReason: "item-limit" },
    ) === "Google Drive shared-folder index reached its item limit",
    "the shared item-limit message names the actual bound",
  );
  assert(
    driveIndexCaveat(
      { partial: true, partialReason: "time-limit" },
      { partial: false },
    ) === "Google Drive shortcut indexing stopped at the time limit",
    "the time-limit message does not blame depth",
  );
  assert(
    driveIndexCaveat({ partial: true }, { partial: false }) ===
      "Google Drive index stopped early",
    "a legacy partial index uses a neutral message",
  );

  const brokenTargets = path.join(
    syntheticCloud,
    "GoogleDrive-bar@example.com",
    ".shortcut-targets-by-id",
  );
  fs.mkdirSync(path.dirname(brokenTargets), { recursive: true });
  fs.writeFileSync(brokenTargets, "not a directory");
  const mixedDriveRoots = await googleDriveRoots(syntheticCloud);
  assert(
    !mixedDriveRoots.available && mixedDriveRoots.roots.length === 1,
    "one broken Drive account makes multi-account discovery unavailable",
  );
  assert(
    !sharedCloudFolderResult(syntheticCloud).available,
    "one broken Drive account prevents promotion of a partial shared index",
  );
  fs.rmSync(path.dirname(brokenTargets), { recursive: true, force: true });

  const driveSubtree = path.join(
    syntheticCloud,
    "GoogleDrive-foo@example.com",
    "My Drive",
    "foo",
  );
  fs.mkdirSync(driveSubtree, { recursive: true });
  let shortcutProgress = 0;
  const interruptedShortcuts = await scanShortcuts({
    cloudRoot: syntheticCloud,
    maxDepth: 3,
    onProgress: () => {
      shortcutProgress++;
      if (shortcutProgress === 1)
        fs.rmSync(path.dirname(driveSubtree), { recursive: true, force: true });
    },
  });
  assert(
    !interruptedShortcuts.available,
    "a Drive traversal failure cannot be promoted as a valid shortcut index",
  );

  const sharedSubtree = path.join(targetRoot, "foo", "bar");
  fs.mkdirSync(sharedSubtree, { recursive: true });
  let sharedProgress = 0;
  const interruptedShared = await scanSharedFolders({
    cloudRoot: syntheticCloud,
    maxDepth: 3,
    onProgress: () => {
      sharedProgress++;
      if (sharedProgress === 1)
        fs.rmSync(path.dirname(sharedSubtree), {
          recursive: true,
          force: true,
        });
    },
  });
  assert(
    !interruptedShared.available,
    "a Drive traversal failure cannot be promoted as a valid shared index",
  );
  fs.rmSync(syntheticCloud, { recursive: true, force: true });

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
    "/Users/u/Library/CloudStorage/GoogleDrive-a@b.com/.shortcut-targets-by-id/1AbC/Shared Folder/Committee Papers";
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
    "the longest token is what Spotlight is asked for",
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
    spotlight: "done",
    ranking: "done",
  };
  assert(isSettled(settled), "everything done is settled");
  assert(statusLight(settled) === "🟢", "settled shows the green light");
  assert(describeProgress(settled) === "complete", "and collapses to one word");

  assert(
    isSettled({ ...settled, spotlight: "skipped", folder: "skipped" }),
    "a skipped stage does not hold the list open",
  );

  // Every unfinished stage must keep progress unsettled.
  for (const stage of ["memory", "folder", "spotlight", "ranking"] as const) {
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
    deriveProgress({ ...base, searching: true }).spotlight === "running",
    "an in-flight pass reads running",
  );
  assert(
    deriveProgress({ ...base, termLength: 1 }).spotlight === "waiting" &&
      deriveProgress({ ...base, termLength: 1 }).needed === 2,
    "a short term waits, and says how much is missing",
  );
  assert(
    deriveProgress({ ...base, query: "" }).spotlight === "skipped",
    "an empty query skips Spotlight rather than waiting on it",
  );
  assert(
    deriveProgress({ ...base, isPathQuery: true }).spotlight === "skipped",
    "the path bar skips Spotlight",
  );
  // A hidden-only query skips Spotlight.
  const bare = deriveProgress({
    ...base,
    query: ".",
    isHiddenOnly: true,
    termLength: 0,
  });
  assert(
    bare.spotlight === "skipped" && bare.needed === undefined,
    "a hidden-only query skips Spotlight instead of asking for more characters",
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
  const failedSearch = deriveProgress({ ...base, searchFailed: true });
  assert(
    isSettled(failedSearch) && statusLight(failedSearch) === "🔴",
    "a failed Spotlight search settles with a red status instead of green",
  );
  const failedPathListing = deriveProgress({
    ...base,
    isPathQuery: true,
    folderFailed: true,
  });
  assert(
    failedPathListing.folder === "failed" &&
      failedPathListing.spotlight === "skipped" &&
      statusLight(failedPathListing) === "🔴" &&
      !describeProgress(failedPathListing).includes("Spotlight failed"),
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
    spotlight: "running",
    ranking: "done",
  };
  assert(
    describeProgress(mid) === "memory ✓ · Spotlight … · ranking ✓",
    `named stages, skipping what does not apply (${describeProgress(mid)})`,
  );
  const short: Progress = {
    memory: "done",
    folder: "skipped",
    spotlight: "waiting",
    ranking: "done",
    needed: 2,
  };
  assert(
    describeProgress(short).includes("Spotlight needs 2 more"),
    `a wait says what it is waiting for (${describeProgress(short)})`,
  );

  console.log("\n=== searching inside a hidden folder ===");
  // Dot-prefixed terms identify hidden roots for direct walking.
  assert(
    dottedTerms(parseQuery(".config nvim")).join(",") === ".config",
    "a dotted term names a folder to look inside",
  );
  assert(
    dottedTerms(parseQuery(".config/nvim")).join(",") === ".config",
    "only the leading component names the place",
  );
  assert(
    dottedTerms(parseQuery("config nvim")).length === 0,
    "without the dot, hidden folders are left alone",
  );
  assert(
    dottedTerms(parseQuery("proj .")).length === 0,
    "a bare dot names no folder — it is the hidden-only filter",
  );

  const hidden = fs.mkdtempSync(path.join(os.tmpdir(), "hidden-"));
  fs.mkdirSync(path.join(hidden, ".tool", "skills", "deep"), {
    recursive: true,
  });
  fs.writeFileSync(path.join(hidden, ".tool", "skills", "one.md"), "");
  fs.mkdirSync(path.join(hidden, ".other"), { recursive: true });
  fs.mkdirSync(path.join(hidden, "visible"), { recursive: true });

  assert(
    hiddenDirsMatching(hidden, [".tool"]).length === 1,
    "an exact dotted name finds its folder",
  );
  assert(
    hiddenDirsMatching(hidden, [".to"]).length === 1,
    "a partial dotted name finds it too",
  );
  assert(
    hiddenDirsMatching(hidden, [".x"]).length === 0,
    "a name that matches nothing finds nothing",
  );
  assert(
    !hiddenDirsMatching(hidden, [".tool", ".other", ".visible"]).some((p) =>
      p.endsWith("visible"),
    ),
    "a folder without a leading dot is never a hidden root",
  );

  const q = parseQuery(".tool skills");
  const roots = hiddenDirsMatching(hidden, dottedTerms(q));
  const walked = await listUnder(roots, { showHidden: true, maxDepth: 4 });
  const found = [...new Set([...roots, ...walked.paths])].filter(
    (p) => matchPath(q, p) !== undefined,
  );
  assert(
    found.some((p) => p.endsWith(path.join(".tool", "skills"))),
    `the folder inside the hidden folder is reached (${found.length} matches)`,
  );
  assert(
    matchPath(q, path.join(hidden, ".tool", "skills")) === MATCH.PREFIX,
    "and it ranks top: the last term matches the last path component",
  );
  fs.rmSync(hidden, { recursive: true, force: true });

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

  console.log("\n=== a filter that excludes folders reaches inside them ===");
  // File-only filters may require expanding matched folders.
  const extQuery = parseQuery("proj ext:cu");
  assert(excludesDirectories(extQuery), "ext: rules folders out");
  assert(excludesDirectories(parseQuery("proj -f")), "-f rules folders out");
  assert(
    excludesDirectories(parseQuery("proj size:>1mb")),
    "a size bound rules folders out",
  );
  assert(!excludesDirectories(parseQuery("proj")), "a plain query does not");
  assert(!excludesDirectories(parseQuery("proj -d")), "-d certainly does not");

  const tree = fs.mkdtempSync(path.join(os.tmpdir(), "expand-"));
  fs.mkdirSync(path.join(tree, "proj", "code"), { recursive: true });
  fs.writeFileSync(path.join(tree, "proj", "code", "layer.cu"), "");
  fs.writeFileSync(path.join(tree, "proj", "code", "notes.md"), "");
  fs.mkdirSync(path.join(tree, "proj", ".git"), { recursive: true });
  fs.writeFileSync(path.join(tree, "proj", ".git", "hidden.cu"), "");

  const sharedQueryTree = fs.mkdtempSync(
    path.join(os.tmpdir(), "shared-query-"),
  );
  fs.mkdirSync(path.join(sharedQueryTree, "foo", "bar"), { recursive: true });
  fs.writeFileSync(path.join(sharedQueryTree, "foo", "bar", "baz.txt"), "");
  const sharedMulti = await walkSearch(sharedQueryTree, parseQuery("foo baz"));
  assert(
    sharedMulti.paths.some((p) => p.endsWith(path.join("bar", "baz.txt"))),
    "a direct shared-folder walk supports multi-token path queries",
  );
  const sharedFiltered = await walkSearch(
    sharedQueryTree,
    parseQuery("baz -f ext:txt after:2020 size:<1mb"),
  );
  assert(
    sharedFiltered.paths.some((p) => p.endsWith("baz.txt")),
    "a direct shared-folder walk keeps candidates for parsed filters",
  );
  fs.rmSync(sharedQueryTree, { recursive: true, force: true });
  const unreadableWalk = await walkSearch(
    path.join(os.tmpdir(), "missing-shared-search-root"),
    parseQuery("foo"),
  );
  assert(
    unreadableWalk.error === "Folder search failed",
    "an unreadable shared-folder walk reports an error",
  );
  const unreadableExpansion = await listUnder([
    path.join(os.tmpdir(), "missing-expansion-root"),
  ]);
  assert(
    unreadableExpansion.error === "Folder search failed",
    "an unreadable folder expansion reports an error",
  );
  const mixedExpansion = fs.mkdtempSync(
    path.join(os.tmpdir(), "mixed-expansion-"),
  );
  fs.writeFileSync(path.join(mixedExpansion, "foo.txt"), "");
  fs.writeFileSync(path.join(mixedExpansion, "bar.txt"), "");
  const failedThenBounded = await listUnder(
    [path.join(mixedExpansion, "missing"), mixedExpansion],
    { limit: 1 },
  );
  assert(
    failedThenBounded.truncated &&
      failedThenBounded.error === "Folder search failed",
    "a bounded expansion retains earlier read failures",
  );
  fs.rmSync(mixedExpansion, { recursive: true, force: true });

  // Model Spotlight returning the named folder without its descendants.
  const fromSpotlight = [path.join(tree, "proj")];
  assert(
    fromSpotlight.filter((p) => matchPath(extQuery, p) !== undefined).length ===
      0,
    "Spotlight's own answer yields nothing — the bug being fixed",
  );

  const inside = await listUnder(fromSpotlight);
  const merged = [...new Set([...fromSpotlight, ...inside.paths])];
  const hits = merged.filter((p) => matchPath(extQuery, p) !== undefined);
  assert(
    hits.length === 1 && hits[0].endsWith("layer.cu"),
    `expanding the folder finds the .cu file inside it (${hits.length} hit)`,
  );
  assert(
    !merged.some((p) => p.includes(".git")),
    "hidden entries stay out of the expansion by default",
  );
  const withHidden = await listUnder(fromSpotlight, { showHidden: true });
  assert(
    withHidden.paths.some((p) => p.endsWith("hidden.cu")),
    "showHidden reaches them",
  );
  const bounded = await listUnder(fromSpotlight, { limit: 1 });
  assert(
    bounded.paths.length === 1 && bounded.truncated,
    "the limit is honoured and reported",
  );
  const depthBounded = await listUnder(fromSpotlight, { maxDepth: 0 });
  assert(
    depthBounded.truncated,
    "listUnder reports that a depth limit left directories unexplored",
  );
  const searchDepthBounded = await walkSearch(
    path.join(tree, "proj"),
    parseQuery("code"),
    { maxDepth: 0 },
  );
  assert(
    searchDepthBounded.truncated,
    "walkSearch reports that a depth limit left directories unexplored",
  );
  fs.rmSync(tree, { recursive: true, force: true });

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
  const cloudPath = `${home}/Library/CloudStorage/GoogleDrive-a@b.com/My Drive/foo/bar`;
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
  const places = standardPlaces();
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
    const probe = shared[0];
    const viaSpotlight = await searchPaths(probe.name, { showHidden: false });
    assert(
      !viaSpotlight.includes(probe.path),
      "Spotlight does not find the sampled shared folder",
    );
    assert(
      locationLabel(probe.path).startsWith("shared folder · "),
      "the shared-folder label hides the raw shortcut id",
    );
  }

  console.log("\n=== walking what Spotlight cannot see ===");
  assert(
    isUnindexedScope(shared[0].path),
    "a shared folder is recognized as unindexed",
  );
  assert(!isUnindexedScope(`${home}/Documents`), "an ordinary folder is not");
  // Derive the probe from available shared-folder contents.
  const probeSubject = shared
    .map((f) => ({ folder: f, children: readDirectory(f.path, false).entries }))
    .find((c) => c.children.length > 0);
  if (probeSubject) {
    const probe =
      probeSubject.children[0].name.split(/[\s._-]/)[0] ||
      probeSubject.children[0].name;
    const viaSpotlight = await searchPaths(probe, {
      scope: probeSubject.folder.path,
    });
    const t = Date.now();
    const walked = await walkSearch(
      probeSubject.folder.path,
      parseQuery(probe),
      {
        maxDepth: 3,
        budgetMs: 20000,
      },
    );
    const ms = Date.now() - t;
    assert(
      viaSpotlight.length === 0,
      "Spotlight returns no hits inside the sampled shared folder",
    );
    assert(
      walked.paths.length > 0,
      `walking finds ${walked.paths.length} in ${ms}ms (truncated=${walked.truncated})`,
    );
  } else {
    console.log("  (no shared folder with contents on this machine, skipped)");
  }

  console.log("\n=== shortcut scan (what the background job stores) ===");
  const scanStarted = Date.now();
  const idx = await scanShortcuts({ maxDepth: 3, budgetMs: 60000 });
  console.log(
    `  ${idx.shortcuts.length} shortcuts in ${Date.now() - scanStarted}ms (partial=${idx.partial}, reason=${idx.partialReason ?? "none"})`,
  );
  assert(idx.shortcuts.length > 0, "the scan finds Drive shortcuts");
  const namedShortcut = idx.shortcuts[0];
  assert(
    namedShortcut !== undefined && namedShortcut.name.length > 0,
    "each shortcut is recorded under the name you gave it in My Drive",
  );
  if (namedShortcut) {
    const spotlightSees = await searchPaths(namedShortcut.name, {
      showHidden: false,
    });
    assert(
      !spotlightSees.includes(namedShortcut.path),
      "…which Spotlight cannot find by that name, confirming why the scan exists",
    );
  }
  // Ignore unrelated symlinks outside Google Drive shortcut targets.
  const leaked = idx.shortcuts.filter(
    (sc) => !sc.target.includes(".shortcut-targets-by-id"),
  );
  assert(
    leaked.length === 0,
    `no non-shortcut symlinks leak in (${leaked.length} did)`,
  );
  console.log("    all resolve into .shortcut-targets-by-id");

  console.log("\n=== one folder, two routes ===");
  // Verify that a shortcut and its target resolve to one storage key.
  const viaShortcut = namedShortcut?.path;
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

  console.log("\n=== shared-folder content index ===");
  const sharedScanStarted = Date.now();
  const sharedIdx = await scanSharedFolders({ maxDepth: 6, budgetMs: 60_000 });
  console.log(
    `  ${sharedIdx.paths.length} paths in ${Date.now() - sharedScanStarted}ms (partial=${sharedIdx.partial}, reason=${sharedIdx.partialReason ?? "none"})`,
  );
  assert(sharedIdx.paths.length > 0, "the shared-folder scan returns content");
  // Derive the query token from the current index.
  const deepEntry = sharedIdx.paths.find((p) => relativeDepth(home, p) > 4);
  if (deepEntry) {
    const token =
      path.basename(deepEntry).split(/[\s._-]/)[0] || path.basename(deepEntry);
    const found = sharedIdx.paths.filter(
      (p) => matchTier(token, path.basename(p)) !== undefined,
    );
    assert(
      found.length > 0,
      `a name from deep inside a shared folder is in the index (${found.length} match)`,
    );
    const viaSpotlightAgain = await searchPaths(token, { showHidden: false });
    assert(
      !viaSpotlightAgain.includes(deepEntry),
      "…and Spotlight still cannot see it, which is why the index exists",
    );
  } else {
    console.log("  (nothing deep enough inside a shared folder, skipped)");
  }

  console.log("\n=== Finder's trailing slash ===");
  const withSlash = `${home}/Documents/`;
  const child = `${home}/Documents/Some Folder`;
  assert(
    path.dirname(child) !== withSlash,
    "the raw Finder path breaks the direct-child test",
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

  console.log("\n=== starting from an arbitrary folder ===");
  if (cloudChild) {
    const root = cloudChild.path;
    assert(
      readDirectory(root, false).error === undefined,
      "a folder inside a cloud drive is readable",
    );
    const token = cloudChild.name.slice(0, 4);
    const scoped = await searchPaths(token, { scope: root, showHidden: false });
    const fromHome = await searchPaths(token, {
      scope: home,
      showHidden: false,
    });
    const cloudHits = fromHome.filter((p) => p.includes("/CloudStorage/"));
    assert(
      scoped.length >= 0,
      `recursive search runs when rooted inside a cloud drive (${scoped.length} hits)`,
    );
    assert(
      cloudHits.length > 0 || fromHome.length === 0,
      `searching from ~ reaches cloud drives (${cloudHits.length} of ${fromHome.length} hits)`,
    );
  } else {
    console.log("  (no cloud drive on this machine, skipped)");
  }

  console.log("\n=== whole-disk search (no scope) ===");
  assert(
    isSystemPath("/System/Library/Fonts/Helvetica.ttc"),
    "/System is excluded",
  );
  assert(isSystemPath("/usr/local/bin/node"), "/usr is excluded");
  assert(
    !isSystemPath("/Applications/Safari.app"),
    "/Applications is kept — apps are legitimate hits",
  );
  assert(!isSystemPath(`${home}/Documents/x.pdf`), "the home folder is kept");
  // Derive the search term from the current cloud drive.
  const reachTarget = cloudChild?.path;
  const everywhere = await searchPaths(
    reachTarget ? path.basename(reachTarget) : "Documents",
    { showHidden: false },
  );
  assert(
    reachTarget === undefined || everywhere.includes(reachTarget),
    "an unscoped search reaches into a cloud drive",
  );
  assert(
    everywhere.every((p) => !isSystemPath(p)),
    "no system paths in unscoped results",
  );
  console.log(`    ${everywhere.length} hits across the whole index`);

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

  console.log(
    "\n=== a nested folder is reachable from the folder above it ===",
  );
  // Verify that recursive search reaches beyond direct children.
  const parentWithSub = readDirectory(home, false)
    .entries.filter(
      (e) => e.isDirectory && !isNoisyPath(e.path + "/x", home, false),
    )
    .map((e) => ({
      parent: e,
      sub: readDirectory(e.path, false).entries.find((c) => c.isDirectory),
    }))
    .find((c) => c.sub !== undefined);

  if (parentWithSub?.sub) {
    const subName = parentWithSub.sub.name;
    const token = subName.split(/[\s._-]/)[0] || subName;
    const hits = await searchPaths(token, { scope: home, showHidden: false });
    assert(
      hits.includes(parentWithSub.sub.path),
      "a folder two levels down is reachable from the home folder",
    );
    // CloudStorage is allowed; other Library branches are filtered.
    const libraryNoise = hits.filter(
      (p) =>
        p.includes("/Library/") &&
        !/\/Library\/(CloudStorage|Mobile Documents)\//.test(p),
    );
    assert(
      libraryNoise.length === 0,
      `no Library app-state noise survives (${libraryNoise.length} leaked of ${hits.length})`,
    );
    const nested = hits
      .filter((p) => path.dirname(p) !== home)
      .map(statEntry)
      .filter((e): e is Entry => e !== undefined);
    const ranked = rank(nested, {}, token, home);
    const position = ranked.findIndex(
      (r) => r.entry.path === parentWithSub.sub?.path,
    );
    assert(
      position >= 0,
      `and it appears in the ranked list (position ${position + 1} of ${ranked.length})`,
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
  const meta = await readUsageMeta(read.entries.map((e) => e.path));
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

void main().catch(() => {
  console.error("\nLive diagnostics stopped because a local check failed.");
  process.exitCode = 1;
});
