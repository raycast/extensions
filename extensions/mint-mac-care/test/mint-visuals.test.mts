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
import { fitText, glanceSVG, listSVG, markdownImage, ringSegments, squaresSVG, textWidth, trendSVG } from "../src/mint-visuals.ts";
import { estimatedFraction, expectedSeconds } from "../src/progress-estimate.ts";

const care: AutoCareJSON = {
  automationAllowed: true,
  memory: { available: true, enabled: true, threshold: 90 },
  tasks: [
    { taskType: "cleanup", diskCareBucket: "optimizable", enabled: true, scheduleFrequency: "hourly" },
    { taskType: "cleanup", diskCareBucket: "clutter", enabled: false, scheduleFrequency: "daily" },
    { taskType: "organize", enabled: true, scheduleFrequency: "daily", scheduleTimeMinutes: 540, folderPaths: ["/Users/x/Desktop"] },
  ],
  folders: [{ path: "/Users/x/Downloads", organizeOnArrival: true }],
};

test("ring segments follow the menu bar: Keep first, each at its share, a sliver for a tiny part", () => {
  const circumference = 2 * Math.PI * 40;
  const segments = ringSegments(
    [
      { bytes: 346e9, color: "keep" },
      { bytes: 40e9, color: "yours" },
      { bytes: 0, color: "safe" },
      { bytes: 1e6, color: "optimizable" },
    ],
    494e9,
    circumference,
  );
  assert.deepEqual(segments.map((segment) => segment.color), ["keep", "yours", "optimizable"]);
  assert.equal(segments[0].from, 0);
  assert.ok(Math.abs(segments[1].from - 346 / 494) < 1e-9);
  assert.ok((segments[2].to - segments[2].from) * circumference >= 0.99);
  assert.deepEqual(ringSegments([{ bytes: 1, color: "x" }], 0, circumference), []);
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
  assert.deepEqual(withGroups.legend.map((row) => row.title), ["Optimizable", "Safe to clean", "Yours", "Keep"]);
  assert.deepEqual(withGroups.center, { value: "1.5 GB", label: "ready" });
  assert.equal(withGroups.usage, "417.4 GB / 494.4 GB");
  assert.equal(withGroups.care, "Every hour, when idle");

  const fallback = diskCard({ disk: { totalGB: 460, freeGB: 70 } }, care, formatCompact)!;
  assert.deepEqual(fallback.legend.map((row) => [row.title, Boolean(row.free)]), [["In use", false], ["Free", true]]);
  assert.equal(fallback.center.label, "free");
  assert.equal(diskCard({}, care, formatCompact), undefined);
});

test("the Memory card shows Mint's piles, or used and free before they exist", () => {
  const piles = memoryCard(
    { usedBytes: 28.4e9, totalBytes: 34.4e9, piles: { idleBytes: 0, inUseBytes: 23.5e9, keepBytes: 4.9e9 } },
    care,
    formatCompact,
  )!;
  assert.deepEqual(piles.legend.map((row) => row.title), ["Idle", "In use", "Keep"]);
  assert.deepEqual(piles.center, { value: "0 B", label: "idle" });
  assert.equal(piles.care, "At 90% used");
  const plain = memoryCard({ usedBytes: 27e9, totalBytes: 34e9 }, care, formatCompact)!;
  assert.deepEqual(plain.center, { value: "7.0 GB", label: "free" });
});

test("Auto Care lines say what is on, and a plan-less Mac says so", () => {
  assert.equal(diskCare(undefined), "…");
  assert.equal(diskCare({ automationAllowed: false }), "Needs a plan");
  assert.equal(diskCare({ tasks: [] }), "Off");
  assert.equal(memoryCare({ memory: { available: true, enabled: false } }), "Off");
  const cards = folderCards(
    [
      { path: "/Users/x/Desktop", toSort: 2 },
      { path: "/Users/x/Downloads", toSort: 0, organizeOnArrival: true },
      { path: "/Users/x/Inbox" },
    ],
    care,
  );
  assert.deepEqual(
    cards.map((card) => [card.name, card.status, card.care]),
    [
      ["Desktop", "2 to sort", "Daily, 9:00 AM"],
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
      folders: [{ name: "R&D <drafts>", status: "2 to sort", care: "Off" }, { name: "Downloads", status: "Tidy", care: "Off" }],
      moreFolders: 3,
    });
    assert.ok(height <= 340, `${height} fits under Raycast's ~360 pt of detail`);
    assert.ok(svg.includes("R&amp;D &lt;drafts&gt;"));
    assert.ok(svg.includes("3 more in Mint"));
  }
  const bare = glanceSVG({ appearance: "dark", format: formatCompact });
  assert.equal(bare.height, 200, "no folders, no Organize row");
});

test("the four groups read from Mint's saved scan fold as the CLI folds them", () => {
  const saved = {
    tree: [
      { onDisk: 100, decisionBytes: { optimizable: 5, rebuildable: 10, leftovers: 2, clutter: 20, compressible: 3, retained: 60 } },
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
  assert.deepEqual(rows[2].series.map((point) => point.bytes), [null, null, 30]);
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
  const rects = [...svg.matchAll(/<rect x="([\d.]+)" y="72"[^>]*fill="([^"]+)"/g)];
  assert.equal(rects[1][1], "0.0");
  assert.equal(rects[1][2], "#F5BD45");
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
  assert.equal((svg.match(/stroke-width="2"/g) ?? []).length, 2);
  assert.ok(!svg.includes("NaN"));
});

test("progress lights its share of the squares and says when it is an estimate", () => {
  const live = squaresSVG({ appearance: "dark", fraction: 0.5, title: "Scanning" });
  assert.equal((live.svg.match(/fill="#BDFE3A"/g) ?? []).length, 20);
  assert.ok(live.svg.includes(">50%<"));
  const guessed = squaresSVG({ appearance: "dark", fraction: 0.42, title: "Scanning", estimated: true });
  assert.ok(guessed.svg.includes(">about 42%<"));
  // The next square blinks, in the accent or not at all; a full bar has none.
  assert.equal((live.svg.match(/<animate /g) ?? []).length, 1);
  assert.match(live.svg, /calcMode="discrete"/);
  assert.equal((squaresSVG({ appearance: "dark", fraction: 1, title: "Done" }).svg.match(/<animate /g) ?? []).length, 0);
});

test("an estimate keeps moving past the expected time and never finishes by itself", () => {
  const at = (seconds: number) => estimatedFraction(seconds, 60);
  assert.equal(at(0), 0);
  assert.ok(Math.abs(at(60) - 0.85) < 1e-9);
  // The run that broke it: slower than the last one. It used to hold at 95%.
  assert.ok(at(90) > at(60) + 0.05);
  assert.ok(at(120) > at(90) + 0.01);
  assert.ok(at(600) <= 0.99);
  let previous = 0;
  for (let second = 1; second <= 300; second += 1) {
    const value = at(second);
    assert.ok(value >= previous);
    previous = value;
  }
  // The slowest recent run is the one planned for.
  assert.equal(expectedSeconds([70, 160, 95], 60), 160);
  assert.equal(expectedSeconds([], 60), 60);
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
      (t) => !t.end && t.size === 13.5 && (row.title.startsWith(t.value.replace(/…$/, "")) || t.value === row.title),
    );
    const detail = texts.find(
      (t) => t.end && t.size === 12.5 && t.value.replace(/…$/, "") && row.detail.startsWith(t.value.replace(/…$/, "")),
    );
    assert.ok(title && detail, `${row.title} drawn`);
    const titleRight = title.x + textWidth(title.value, 13.5);
    const detailLeft = detail.x - textWidth(detail.value, 12.5);
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
