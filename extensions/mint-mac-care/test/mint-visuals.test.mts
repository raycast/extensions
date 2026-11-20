import assert from "node:assert/strict";
import test from "node:test";
import { formatCompact } from "../src/mint-cli.ts";
import {
  attributed,
  diskCard,
  diskCare,
  folderCards,
  groupsFromPresentation,
  memoryCard,
  memoryCare,
  memoryScale,
  growers,
  parseAtlasHistory,
  sourceOf,
  windowStartIndex,
  type AutoCareJSON,
} from "../src/mint-model.ts";
import {
  PANE_WIDTH,
  fitText,
  glanceSVG,
  listSVG,
  allocateDots,
  cardMeterDots,
  dotsThatFit,
  markdownImage,
  monoWidth,
  scanProgressSVG,
  textWidth,
  trendSVG,
} from "../src/mint-visuals.ts";
import { expectedSeconds, progressStep, scanEstimatedFraction } from "../src/progress-estimate.ts";

/** What a picture says, its text in order, tags dropped. */
const words = (svg: string) =>
  [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((match) => match[1].replace(/&amp;/g, "&")).join(" ");
/** The dots of a row drawn at `cy`, with their fill. */
const dotsAt = (svg: string, cy: number) =>
  [...svg.matchAll(new RegExp(`<circle cx="([\\d.]+)" cy="${cy}" r="1.7" fill="([^"]+)"`, "g"))].map((m) => ({
    x: Number(m[1]),
    fill: m[2],
  }));

const care: AutoCareJSON = {
  automationAllowed: true,
  memory: { available: true, enabled: true, threshold: 90 },
  tasks: [
    {
      taskType: "cleanup",
      diskCareBucket: "optimizable",
      enabled: true,
      scheduleFrequency: "hourly",
      scheduleTimeMinutes: 420,
    },
    { taskType: "cleanup", diskCareBucket: "clutter", enabled: false, scheduleFrequency: "daily" },
    {
      taskType: "organize",
      enabled: true,
      scheduleFrequency: "daily",
      scheduleTimeMinutes: 540,
      folderPaths: ["/Users/x/Desktop"],
    },
  ],
  folders: [{ path: "/Users/x/Downloads", organizeOnArrival: true }],
};

test("a dot meter shares its dots as MintDotMeter does: in proportion, every part seen, exactly the row", () => {
  assert.equal(dotsThatFit(420), 72);
  assert.equal(dotsThatFit(3), 0);
  // Keep 346 GB, Yours 40 GB, an empty part, Optimizable 1 MB: the 1 MB still gets its dot.
  const counts = allocateDots([346e9, 40e9, 0, 1e6], 72, 1);
  assert.equal(
    counts.reduce((a, b) => a + b, 0),
    72,
  );
  assert.equal(counts[2], 0);
  assert.equal(counts[3], 1);
  assert.ok(counts[0] > counts[1] * 7);
  assert.deepEqual(allocateDots([0, 0], 10), [0, 0]);
  assert.deepEqual(allocateDots([1, 1, 1], 0), [0, 0, 0]);
});

test("the Disk card is the dropdown's: groups when Mint states them, used and free when it does not", () => {
  const withGroups = diskCard(
    {
      volume: { freeBytes: 77e9, totalBytes: 494.4e9 },
      groups: { optimizableBytes: 1.2e9, safeToCleanBytes: 0.3e9, yoursBytes: 39.8e9, keepBytes: 346.9e9 },
    },
    care,
    formatCompact,
  )!;
  assert.deepEqual(
    withGroups.legend.map((row) => row.title),
    ["Optimizable", "Safe to clean", "Yours", "Keep"],
  );
  assert.deepEqual(withGroups.center, { value: "1.5 GB", label: "ready" });
  // With the Get back card above it, the Disk card says free space instead: one fact, said once.
  assert.deepEqual(
    diskCard({ volume: { freeBytes: 77e9, totalBytes: 494.4e9 }, groups: {} }, care, formatCompact, true)!.center,
    {
      value: "77.0 GB",
      label: "free",
    },
  );
  assert.equal(withGroups.usage, "417.4 GB / 494.4 GB");
  assert.equal(withGroups.care, "Hourly when idle");

  const fallback = diskCard({ disk: { totalGB: 460, freeGB: 70 } }, care, formatCompact)!;
  assert.deepEqual(
    fallback.legend.map((row) => [row.title, Boolean(row.free)]),
    [
      ["In use", false],
      ["Free", true],
    ],
  );
  assert.equal(fallback.center.label, "free");
  assert.equal(diskCard({}, care, formatCompact), undefined);
});

test("the Memory card shows Mint's piles, or used and free before they exist", () => {
  const piles = memoryCard(
    { usedBytes: 28.4e9, totalBytes: 34.4e9, piles: { idleBytes: 0, inUseBytes: 23.5e9, keepBytes: 4.9e9 } },
    care,
    formatCompact,
  )!;
  assert.deepEqual(
    piles.legend.map((row) => row.title),
    ["Idle", "In use", "Keep"],
  );
  assert.deepEqual(piles.center, { value: "0 B", label: "idle" });
  assert.equal(piles.care, "Starts at 90%");
  const plain = memoryCard({ usedBytes: 27e9, totalBytes: 34e9 }, care, formatCompact)!;
  assert.deepEqual(plain.center, { value: "7.0 GB", label: "free" });
});

test("Auto Care lines say what is on, and a plan-less Mac says so", () => {
  assert.equal(diskCare(undefined), "…");
  assert.equal(diskCare({ automationAllowed: false }), "Locked");
  assert.equal(diskCare({ tasks: [] }), "Off");
  assert.equal(memoryCare({ memory: { available: true, enabled: false } }), "Off");
  const cards = folderCards(
    [
      { path: "/Users/x/Desktop", toSort: 2 },
      { path: "/Users/x/Downloads", toSort: 0 },
      { path: "/Users/x/Inbox" },
    ],
    care,
  );
  assert.deepEqual(
    cards.map((card) => [card.name, card.status, card.care]),
    [
      ["Desktop", "2 to sort", "Daily at 9:00 AM"],
      ["Downloads", "Tidy", "As files arrive"],
      ["Inbox", "…", "Off"],
    ],
  );
});

test("memory is attributed the way Mint does: scaled to host used, never up", () => {
  assert.equal(memoryScale([10, 10], 30), 1, "processes already fit: their own numbers");
  const scale = memoryScale([30e9, 10e9], 20e9);
  assert.equal(scale, 0.5);
  assert.equal(attributed(30e9, scale), 15e9);
  assert.equal(attributed(-5, scale), 0);
  assert.equal(memoryScale([1], null), 1);
});

test("the glance fits one Raycast screen and escapes what it prints", () => {
  for (const appearance of ["dark", "light"] as const) {
    const { svg, height } = glanceSVG({
      appearance,
      format: formatCompact,
      disk: diskCard({ volume: { freeBytes: 77e9, totalBytes: 494e9 } }, care, formatCompact),
      memory: memoryCard({ usedBytes: 27e9, totalBytes: 34e9 }, care, formatCompact),
      folders: [
        { name: "R&D <drafts>", status: "2 to sort", care: "Off" },
        { name: "Downloads", status: "Tidy", care: "Off" },
      ],
      moreFolders: 3,
    });
    assert.ok(height <= 250, `${height} leaves room for the Get back card`);
    assert.ok(svg.includes("R&amp;D &lt;drafts&gt;"));
    assert.ok(svg.includes("3 more in Mint"));
  }
  const bare = glanceSVG({ appearance: "dark", format: formatCompact });
  assert.equal(bare.height, 154, "no folders, no folder row");
  // With the Get back card on top it still fits Raycast's ~377 pt of detail.
  const full = glanceSVG({
    appearance: "light",
    format: formatCompact,
    nudge: {
      getBackBytes: 12.3e9,
      optimizableBytes: 3.4e9,
      safeToCleanBytes: 8.9e9,
      series: [
        { at: 0, gb: 0 },
        { at: 1, gb: 4 },
      ],
      rise: "+4.0 GB in 30 days",
      level: "Notify me · 10 GB",
    },
    disk: diskCard({ volume: { freeBytes: 77e9, totalBytes: 494e9 } }, care, formatCompact, true),
    memory: memoryCard({ usedBytes: 27e9, totalBytes: 34e9 }, care, formatCompact),
    folders: [
      { name: "Desktop", status: "2 to sort", care: "Off" },
      { name: "Downloads", status: "Tidy", care: "Off" },
    ],
    moreFolders: 1,
  });
  assert.ok(full.height <= 377, `${full.height}`);
  const said = words(full.svg);
  for (const phrase of [
    "Get back",
    "12.3 GB",
    "Can come back",
    "+4.0 GB in 30 days",
    "Notify me · 10 GB",
    "Optimizable",
    "Safe to clean",
  ]) {
    assert.ok(said.includes(phrase), phrase);
  }
});

test("the four groups read from Mint's saved scan fold as the CLI folds them", () => {
  const saved = {
    tree: [
      {
        onDisk: 100,
        decisionBytes: { optimizable: 5, rebuildable: 10, leftovers: 2, clutter: 20, compressible: 3, retained: 60 },
      },
      { onDisk: 40, decisionBytes: { agentConversations: 7, retained: 33 } },
      { onDisk: 9 },
      { onDisk: 1, decisionBytes: { someFutureKey: 1 } },
    ],
  };
  assert.deepEqual(groupsFromPresentation(saved), {
    optimizableBytes: 5,
    safeToCleanBytes: 12,
    yoursBytes: 23,
    keepBytes: 109,
  });
  assert.equal(groupsFromPresentation({ tree: [] }), undefined);
  assert.equal(groupsFromPresentation(undefined), undefined);
});

test("markdown images are base64 SVG data sized for Raycast", () => {
  assert.equal(
    markdownImage("<svg/>", 680, 330, "Mint"),
    `![Mint](data:image/svg+xml;base64,${Buffer.from("<svg/>").toString("base64")}?raycast-width=680&raycast-height=330)`,
  );
});

test("a copy belongs to the AI tool whose folder holds it, the longest root winning", () => {
  const home = "/Users/x";
  assert.equal(sourceOf("/Users/x/.codex/sessions/a.jsonl", home), "agent:codex");
  assert.equal(sourceOf("/Users/x/Library/Application Support/Claude/vm/a", home), "agent:claudeCode");
  assert.equal(sourceOf("/Users/x/.cache/huggingface/hub/m.bin", home), "agent:huggingFace");
  assert.equal(sourceOf("/private/tmp/build/a.o", home), "tmp");
  assert.equal(sourceOf("/Users/x/Library/Containers/app/a", home), "apps");
  assert.equal(sourceOf("/Users/x/Documents/a.pdf", home), "files");
});

test("growth is measured from the newest map a week before, and never from zero", () => {
  const day = (n: number) => new Date(Date.UTC(2026, 8, n)).toISOString();
  const lines = parseAtlasHistory(
    [
      JSON.stringify({ date: day(10), usedBytes: 100, sources: { github: 50 } }),
      JSON.stringify({ date: day(20), usedBytes: 120, sources: { github: 60, tmp: 5 } }),
      "not json",
      JSON.stringify({ date: day(28), usedBytes: 150, sources: { github: 90, tmp: 4, new: 30 } }),
    ].join("\n"),
  );
  assert.equal(lines.length, 3);
  assert.equal(windowStartIndex(lines, 7), 1);
  const rows = growers(lines, "sources", 7);
  assert.deepEqual(
    rows.map((row) => [row.key, row.change]),
    [
      ["github", 30],
      ["tmp", -1],
      ["new", undefined],
    ],
  );
  assert.deepEqual(
    rows[2].series.map((point) => point.bytes),
    [null, null, 30],
  );
});

test("a group's picture lights its own part of the whole and escapes its rows", () => {
  const { svg } = listSVG({
    appearance: "dark",
    value: "2 GB",
    label: "Idle",
    color: "#F5BD45",
    rows: [{ title: "<Chrome>", value: "1 GB" }],
    whole: [
      { bytes: 1, lit: false },
      { bytes: 3, lit: true },
    ],
  });
  assert.ok(svg.includes("&lt;Chrome&gt;"));
  // The group's share of the whole is lit in its colour from the left; the rest is unlit.
  const meter = dotsAt(svg, 74);
  assert.equal(meter.length, 72);
  assert.equal(meter[0].x, 1.7);
  assert.equal(meter.filter((dot) => dot.fill === "#F5BD45").length, 54);
  assert.ok(meter.slice(0, 54).every((dot) => dot.fill === "#F5BD45"));
});

test("a trend leaves a gap where Mint did not record the entry", () => {
  const { svg } = trendSVG({
    appearance: "light",
    value: "90 GB",
    change: "+30 GB in 7 days",
    color: "#336E00",
    points: [
      { at: 1, bytes: 10 },
      { at: 2, bytes: 20 },
      { at: 3, bytes: null },
      { at: 4, bytes: 40 },
      { at: 5, bytes: 50 },
    ],
    windowStart: 3,
    format: (bytes) => `${bytes} B`,
    startLabel: "Sep 1",
    endLabel: "Sep 5",
  });
  // One column of dots per moment; the moments mapped to the missing entry have none.
  const columns = new Set(
    [...svg.matchAll(/<circle cx="([\d.]+)" cy="(\d[\d.]*)"/g)].filter((m) => Number(m[2]) > 70).map((m) => m[1]),
  );
  assert.ok(columns.size > 30 && columns.size < 60, `${columns.size} columns drawn`);
  assert.ok(!svg.includes("NaN"));
});

test("Disk Growth's line reads at a glance: one lit dot per moment in full ink, the window in the accent", () => {
  for (const appearance of ["dark", "light"] as const) {
    const ink = appearance === "dark" ? "rgba(255,255,255,0.94)" : "rgba(0,0,0,0.9)";
    const unlit = appearance === "dark" ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)";
    const accentInk = appearance === "dark" ? "#BDFE3A" : "#336E00";
    const { svg } = trendSVG({
      appearance,
      value: "419.8 GB",
      change: "−62.5 GB in 7 days",
      color: accentInk,
      points: Array.from({ length: 30 }, (_, day) => ({ at: day, bytes: 400e9 + (day % 7) * 10e9 })),
      windowStart: 23,
      format: formatCompact,
      startLabel: "Aug 19",
      endLabel: "Now",
    });
    const dots = [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="[\d.]+" fill="([^"]+)"([^/]*)\/>/g)]
      .filter((m) => Number(m[2]) > 70)
      .map((m) => ({ x: Number(m[1]), fill: m[3], rest: m[4] }));
    const byColumn = new Map<number, typeof dots>();
    for (const dot of dots) byColumn.set(dot.x, [...(byColumn.get(dot.x) ?? []), dot]);
    assert.equal(byColumn.size, 60);
    for (const column of byColumn.values()) {
      const lit = column.filter((dot) => dot.fill !== unlit);
      assert.equal(lit.length, 1, "one lit dot per moment");
      assert.ok([ink, accentInk].includes(lit[0].fill), lit[0].fill);
    }
    // The unlit grid is Inkdot's unlit ink, never thinned further.
    assert.ok(dots.filter((dot) => dot.fill === unlit).every((dot) => !dot.rest.includes("fill-opacity")));
    const columns = [...byColumn.keys()].sort((a, b) => a - b);
    const litOf = (x: number) => byColumn.get(x)!.find((dot) => dot.fill !== unlit)!.fill;
    assert.equal(litOf(columns[0]), ink, "before the window: full ink");
    assert.equal(litOf(columns[columns.length - 1]), accentInk, "the last 7 days: the accent");
    assert.match(words(svg), /419\.8 GB −62\.5 GB in 7 days/);
  }
});

test("a card's bar is split as its legend: dots per group, at least one each, adding up to the bar", () => {
  const row = (title: string, bytes: number) => ({ title, color: "#000000", bytes });
  // Zero groups: nothing lit, every dot free.
  assert.deepEqual(cardMeterDots([row("A", 0), row("B", 0)], 400e9, 500e9, 50), { counts: [0, 0], free: 50 });
  // A zero group among others gets none; the rest still add up.
  const some = cardMeterDots([row("A", 0), row("B", 300e9)], 300e9, 500e9, 50);
  assert.deepEqual(some, { counts: [0, 30], free: 20 });
  // One tiny group (702 MB of 494 GB) keeps its dot.
  const tiny = cardMeterDots(
    [row("Optimizable", 0.7e9), row("Safe to clean", 1.3e9), row("Yours", 50e9), row("Keep", 371e9)],
    437.2e9,
    494.4e9,
    56,
  );
  assert.ok(tiny.counts.every((count) => count >= 1));
  assert.ok(tiny.free >= 1);
  assert.equal(tiny.counts.reduce((a, b) => a + b, 0) + tiny.free, 56);
  // Rounding that must still sum: three equal thirds and a free third into 10 dots.
  const thirds = cardMeterDots([row("A", 1), row("B", 1), row("C", 1)], 3, 4, 10);
  assert.equal(thirds.counts.reduce((a, b) => a + b, 0) + thirds.free, 10);
  assert.ok(thirds.counts.every((count) => count === 2 || count === 3));
  // Groups scaled into what is used: free space stays what Mint states.
  const over = cardMeterDots([row("A", 600), row("B", 200)], 400, 500, 50);
  assert.deepEqual(over, { counts: [30, 10], free: 10 });
  // The legend's free row is the unlit part, never a group.
  assert.deepEqual(cardMeterDots([row("In use", 80), { ...row("Free", 20), free: true }], 80, 100, 10), {
    counts: [8],
    free: 2,
  });
  assert.deepEqual(cardMeterDots([row("A", 1)], 1, 1, 0), { counts: [0], free: 0 });
});

test("the Disk and Memory bars light in the legend's tints, Keep in neutral ink, free unlit", () => {
  const status = {
    volume: { freeBytes: 57.2e9, totalBytes: 494.4e9 },
    groups: { optimizableBytes: 0.7e9, safeToCleanBytes: 1.3e9, yoursBytes: 50e9, keepBytes: 371e9 },
  };
  const memory = { usedBytes: 14.2e9, totalBytes: 17.2e9, piles: { idleBytes: 4.9e9, inUseBytes: 6.8e9, keepBytes: 2.5e9 } };
  const { svg } = glanceSVG({
    appearance: "dark",
    format: formatCompact,
    disk: diskCard(status, care, formatCompact),
    memory: memoryCard(memory, care, formatCompact),
  });
  const bar = dotsAt(svg, 78);
  // Each card is (680 − 12) / 2 = 334 wide, its bar inset 16 on each side.
  const count = dotsThatFit(334 - 32);
  const disk = bar.filter((dot) => dot.x < 334);
  const mem = bar.filter((dot) => dot.x >= 334);
  assert.equal(disk.length, count);
  assert.equal(mem.length, count);
  const runs = (dots: typeof bar) =>
    dots.reduce<Array<{ fill: string; n: number }>>((out, dot) => {
      if (out.length && out[out.length - 1].fill === dot.fill) out[out.length - 1].n += 1;
      else out.push({ fill: dot.fill, n: 1 });
      return out;
    }, []);
  assert.deepEqual(
    runs(disk).map((run) => run.fill),
    ["#3DDC84", "#62A3FF", "#F5BD45", "rgba(255,255,255,0.48)", "rgba(255,255,255,0.14)"],
  );
  assert.deepEqual(
    runs(mem).map((run) => run.fill),
    ["#F5BD45", "#62A3FF", "rgba(255,255,255,0.48)", "rgba(255,255,255,0.14)"],
  );
  // Every legend dot's colour is in its bar.
  const legendFills = [...svg.matchAll(/<circle cx="[\d.]+" cy="(96\.5|114\.5)" r="1.7" fill="([^"]+)"/g)].map((m) => m[2]);
  for (const fill of legendFills) assert.ok(bar.some((dot) => dot.fill === fill), fill);
});

test("a 1.1.2 cleanup scan's 0.54 never shows: the bar is the forecast, the file gives phase and count", () => {
  // As Mint 1.1.2's SurfaceProgress writes it: no preview fields.
  const file = (fraction: number, phase?: string, files?: number) =>
    JSON.parse(JSON.stringify({ fraction, updatedAt: "2026-10-24T10:00:00Z", files, phase }));
  const expected = expectedSeconds([41, 41, 42, 42, 78], 60);
  let step = progressStep({ fraction: 0 }, undefined, 0.25, expected);
  assert.equal(step.fraction < 0.01, true);
  step = progressStep(step, file(0.54, "Searching style-clone-lab… 4,600 entries checked"), 1, expected);
  assert.ok(step.fraction < 0.02, `first report must not jump the bar, got ${step.fraction}`);
  assert.equal(step.phase, "Searching style-clone-lab… 4,600 entries checked");
  // Mint holds 0.54 for a minute; the forecast still moves, never backwards.
  let previous = step.fraction;
  for (let seconds = 2; seconds <= 200; seconds += 1) {
    step = progressStep(step, file(0.54, "Searching style-clone-lab… 9,000 entries checked"), seconds, expected);
    assert.ok(step.fraction >= previous && step.fraction < 1);
    previous = step.fraction;
  }
  // Mint's 1.0 is not done: only its answer finishes the bar.
  step = progressStep(step, file(1), 400, expected);
  assert.ok(step.fraction < 1);
  assert.equal(step.phase, undefined);
});

test("a 1.1.2 copies scan reports files read; the bar is its own forecast, not the cleanup scan's", () => {
  const disk = expectedSeconds([41, 41, 42, 42, 78], 60);
  const copies = expectedSeconds([40, 40, 43, 43, 54], 60);
  const report = { fraction: 0.06, updatedAt: "2026-10-24T10:00:00Z", files: 268_288, phase: "walking" };
  const step = progressStep({ fraction: 0 }, report, 10, copies);
  assert.equal(step.files, 268_288);
  assert.equal(step.phase, "walking");
  assert.ok(Math.abs(step.fraction - scanEstimatedFraction(10, copies)) < 1e-9);
  assert.ok(step.fraction > progressStep({ fraction: 0 }, report, 10, disk).fraction);
  // A malformed file or one without a fraction keeps the last phase and count.
  const kept = progressStep(step, { files: "x", phase: 3 }, 11, copies);
  assert.equal(kept.files, 268_288);
  assert.equal(progressStep(step, { fraction: 0.1, files: -1 }, 11, copies).files, undefined);
});

test("scan forecasts start at zero, use separate completed histories, and leave room for overruns", () => {
  const disk = expectedSeconds([41, 41, 42, 42, 78], 60);
  const copies = expectedSeconds([40, 40, 43, 43, 54], 60);
  assert.equal(scanEstimatedFraction(0, disk), 0);
  assert.ok(scanEstimatedFraction(1, disk) < 0.02);
  assert.ok(scanEstimatedFraction(5, disk) < 0.07);
  assert.ok(scanEstimatedFraction(5, copies) > scanEstimatedFraction(5, disk));
  assert.ok(scanEstimatedFraction(disk / 2, disk) < 0.5, "Do not front-load the unknown-total forecast");
  assert.ok(scanEstimatedFraction(disk, disk) < 0.9);
  let previous = 0;
  for (let seconds = 0; seconds <= disk * 10; seconds += 0.25) {
    const value = scanEstimatedFraction(seconds, disk);
    assert.ok(value >= previous && value < 1);
    previous = value;
  }
  assert.ok(scanEstimatedFraction(disk * 2, disk) > scanEstimatedFraction(disk, disk));
  for (const invalid of [0, -1, NaN, Infinity]) assert.equal(scanEstimatedFraction(5, invalid), 0);
  // The slowest recent run is the one planned for.
  assert.equal(expectedSeconds([70, 160, 95], 60), 160);
  assert.equal(expectedSeconds([], 60), 60);
});

test("discovery pairs a marked forecast with observed activity and fills only from the left", () => {
  const before = scanProgressSVG({
    appearance: "dark",
    title: "Safe to clean",
    estimate: scanEstimatedFraction(60, 188),
    phase: "Searching style-clone-lab… 201,600 entries checked · 122 found",
  });
  const after = scanProgressSVG({
    appearance: "dark",
    title: "Safe to clean",
    estimate: scanEstimatedFraction(73, 188),
    phase: "Searching style-clone-lab… 229,400 entries checked · 122 found",
  });
  assert.notEqual(before.svg, after.svg);
  assert.match(before.svg, />201,600 checked</);
  assert.match(after.svg, />229,400 checked</);
  assert.match(words(after.svg), /(^| )33% /);
  assert.doesNotMatch(words(after.svg), /~|\d %/);
  assert.match(words(after.svg), /Safe to clean estimated/);
  assert.match(after.svg, />Searching style-clone-lab</);
  assert.doesNotMatch(after.svg, /entries checked|122 found|elapsed|<animate/);
  for (const estimate of [0, 0.1, 0.53, 0.54, 0.8, 0.9999, 1, NaN, Infinity]) {
    const picture = scanProgressSVG({ appearance: "dark", title: "Scanning", estimate });
    const fills = dotsAt(picture.svg, 96).map((dot) => dot.fill);
    const fraction = Number.isFinite(estimate) ? Math.min(0.99, estimate) : 0;
    const lit = Math.floor(fraction * 72);
    assert.equal(fills.length, 72);
    // A Scan has decided nothing yet: its meter is ink, never a bucket's colour.
    assert.ok(fills.slice(0, lit).every((fill) => fill === "rgba(255,255,255,0.94)"));
    assert.ok(fills.slice(lit).every((fill) => fill === "rgba(255,255,255,0.14)"));
    assert.doesNotMatch(picture.svg, /100%|<animate|NaN|Infinity/);
  }
});

test("discovery fits a long or localized location and checked count on one quiet row", () => {
  for (const phase of [
    "Searching " + "very-long-project-name-".repeat(6) + "… 554,200 entries checked · 122 found",
    "正在搜索开发目录中的项目… 已检查 554,200 项 · 找到 122 个",
    "正在搜尋開發目錄中的專案… 已檢查 554,200 項 · 找到 122 個",
  ]) {
    const picture = scanProgressSVG({ appearance: "light", title: "Safe to clean", phase, estimate: 0.58 });
    const labels = [...picture.svg.matchAll(/<text[^>]*y="78"[^>]*>(.*?)<\/text>/g)].map((match) => match[1]);
    assert.equal(labels.length, 2);
    assert.equal(labels[1], "554,200 checked");
    assert.ok(textWidth(labels[0], 12.5) + 20 + monoWidth(labels[1], 10.5) <= PANE_WIDTH);
    assert.equal((picture.svg.match(/<text /g) ?? []).length, 5);
    assert.equal(picture.height, 104);
    assert.doesNotMatch(picture.svg, /122|font-size="20"/);
  }
});

test("Mint 1.2's idle-file stages read as Mint's own words, never their raw names", () => {
  for (const phase of ["selectingCompression", "measuringCompression"]) {
    const picture = scanProgressSVG({ appearance: "dark", title: "Optimizable", phase, estimate: 0.98 });
    assert.match(picture.svg, /Checking idle files…/);
    assert.doesNotMatch(picture.svg, /Compression/);
  }
});

test("Optimizable keeps its observed count and readable phase below the forecast", () => {
  const picture = scanProgressSVG({
    appearance: "dark",
    title: "Optimizable",
    estimate: scanEstimatedFraction(5, 54),
    phase: "walking",
    files: 268_288,
  });
  assert.match(words(picture.svg), /(^| )7% /);
  assert.match(picture.svg, />Reading files…</);
  assert.match(picture.svg, />268,288 checked</);
  assert.doesNotMatch(picture.svg, />walking<|<animate|elapsed/);
  assert.equal((picture.svg.match(/<text /g) ?? []).length, 5);
  for (const phase of ["metadata", "hashing", "checkingUse"]) {
    const later = scanProgressSVG({ appearance: "light", title: "Optimizable", estimate: 0.8, phase, files: 268_288 });
    assert.doesNotMatch(later.svg, new RegExp(`>${phase}<`));
    assert.doesNotMatch(later.svg, /268,288|checked/);
  }
  for (const files of [undefined, NaN, Infinity, -1, 0.5]) {
    const invalid = scanProgressSVG({
      appearance: "dark",
      title: "Optimizable",
      estimate: 0.5,
      phase: "walking",
      files,
    });
    assert.doesNotMatch(invalid.svg, /checked|NaN|Infinity/);
  }
});

test("a long row name is cut by the room it takes and never runs into its detail", () => {
  // The rows of the 2026-09-30 Store screenshot whose names ran into "User Cache Files".
  const rows = [
    ["Codex runtime cache (~/.cache/codex-runtimes)", "User Cache Files", "1.6 GB"],
    ["SwiftPM cache", "User Cache Files", "415 MB"],
    ["Claude partition Cache — launch-preview-2026", "Claude Agent Cache", "184 MB"],
    ["Claude partition Code Cache — launch-preview", "Claude Agent Cache", "74 MB"],
    ["Codex app cache — unused entries (12,480 files)", "Codex Agent Cache", "18 MB"],
    ["Claude Desktop editor cache — unused entries", "Claude Agent Cache", "9 MB"],
    ["Claude Code MCP logs", "User Log Files", "315 KB"],
  ].map(([title, detail, value]) => ({ title, detail, value }));
  const { svg } = listSVG({ appearance: "dark", value: "2.5 GB", label: "10 items", color: "#62A3FF", rows });
  const texts = [...svg.matchAll(/<text x="([\d.]+)"[^>]*font-size="([\d.]+)"([^>]*)>([^<]*)<\/text>/g)].map((m) => ({
    x: Number(m[1]),
    size: Number(m[2]),
    end: m[3].includes('text-anchor="end"'),
    value: m[4].replace(/&amp;/g, "&"),
  }));
  for (const row of rows) {
    const title = texts.find(
      (t) => !t.end && t.size === 13 && (row.title.startsWith(t.value.replace(/…$/, "")) || t.value === row.title),
    );
    const detail = texts.find(
      (t) => t.end && t.size === 10.5 && t.value.replace(/…$/, "") && row.detail.startsWith(t.value.replace(/…$/, "")),
    );
    assert.ok(title && detail, `${row.title} drawn`);
    const titleRight = title.x + textWidth(title.value, 13);
    const detailLeft = detail.x - monoWidth(detail.value, 10.5);
    assert.ok(
      titleRight + 8 <= detailLeft,
      `${title.value} ends at ${titleRight.toFixed(1)}, its detail starts at ${detailLeft.toFixed(1)}`,
    );
  }
  assert.ok(
    texts.some((t) => t.value === "SwiftPM cache"),
    "a short name is not cut",
  );
  assert.ok(
    texts.some((t) => t.value === "Codex Agent Cache"),
    "a detail that fits is not cut",
  );
});

test("fitText measures, not counts: wide letters are cut sooner than narrow ones", () => {
  assert.equal(fitText("SwiftPM cache", 200, 13.5), "SwiftPM cache");
  const wide = fitText("WWWWWWWWWWWWWWWWWWWWWWWW", 120, 13.5);
  const narrow = fitText("iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii", 120, 13.5);
  assert.ok(wide.endsWith("…") && textWidth(wide, 13.5) <= 120);
  assert.ok([...narrow].length > [...wide].length * 2);
  assert.equal(
    fitText("Codex app cache — unused entries", textWidth("Codex app cache — …", 13.5), 13.5),
    "Codex app cache…",
  );
});

test("a name in an image's alt text cannot break the Markdown around it", () => {
  const image = markdownImage("<svg/>", 420, 100, "Odd ](name) [x]\\ two\nlines");
  assert.ok(image.startsWith("![Odd \\](name) \\[x\\]\\\\ two lines]("), image.slice(0, 60));
  assert.equal(image.match(/\]\(data:/g)?.length, 1);
});
