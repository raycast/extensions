import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { NettopDecoder } from "../src/lib/nettop";
import { attributeProcess, canQuitApp, outerAppPath, parseProcesses, sameProcess } from "../src/lib/processes";
import { UsageSession, sortApps, visibleApps } from "../src/lib/usage";
import { formatBytes, formatRate } from "../src/lib/format";
import { chartScale, chartX, trafficMarkdown, trafficSvg } from "../src/lib/chart";
import { orderApps, updateListLayout, type ListLayout } from "../src/lib/list-layout";
import type { AppUsage, ApplicationInfo, Counters, ProcessInfo, RawSample } from "../src/types";

const startedAt = "Fri Oct 16 10:00:00 2026";
function info(pid: number, executable: string, ppid = 1, uid = 501): ProcessInfo {
  return { pid, ppid, uid, executable, startedAt };
}
const appPath = "/Applications/Browser.app";
const main = info(100, `${appPath}/Contents/MacOS/Browser`);
const helper = info(101, `${appPath}/Contents/Frameworks/Browser Helper.app/Contents/MacOS/Browser Helper`, 100);
const child = info(102, "/usr/local/bin/node", 101);
const processes = new Map([main, helper, child].map((p) => [p.pid, p]));
const catalog = new Map<string, ApplicationInfo>([
  [appPath, { name: "My Browser", path: appPath, bundleId: "org.example.browser" }],
]);
function counters(pid: number, bytesIn: number, bytesOut = 0): Counters {
  return { pid, name: `Truncated.${pid}`, bytesIn, bytesOut };
}
function sample(ms: number, rows: Counters[]): RawSample {
  return { timestamp: 1_000_000 + ms, monotonicMs: ms, rows };
}

test("parses captured macOS 27 CSV across arbitrary chunks and preserves every frame", () => {
  const csv = readFileSync(join(__dirname, "fixtures", "nettop-macos-27.csv"), "utf8");
  const frames: RawSample[] = [];
  const decoder = new NettopDecoder((frame) => frames.push(frame));
  for (let i = 0; i < csv.length; i += 7) decoder.push(csv.slice(i, i + 7));
  decoder.end();
  assert.equal(frames.length, 3);
  assert.ok(frames.every((frame) => frame.rows.length === 3));
  assert.equal(frames[0].rows[0].name, "Browser Helper");
});

test("reads counters by header name, CSV quoting, and the final dot before PID", () => {
  const frames: RawSample[] = [];
  const decoder = new NettopDecoder((frame) => frames.push(frame));
  decoder.push('^D\b\b,bytes_out,ignored,bytes_in,\r\n"My, App.Helper.42",20,foo,120,\r\n', 1000, 0);
  decoder.end();
  assert.deepEqual(frames[0].rows, [{ pid: 42, name: "My, App.Helper", bytesIn: 120, bytesOut: 20 }]);
});

test("keeps accepting complete rows after an idle flush until a header or exit", () => {
  const frames: RawSample[] = [];
  const decoder = new NettopDecoder((frame) => frames.push(frame));
  decoder.push(",bytes_in,bytes_out,\nA.1,10,20,\n", 1000, 0);
  decoder.flush();
  decoder.push("B.2,30,40,\n", 1100, 100);
  decoder.flush();
  assert.equal(frames.length, 0);

  decoder.push(",bytes_in,bytes_out,\nA.1,50,60,\n", 2000, 1000);
  assert.deepEqual(frames, [
    {
      timestamp: 1000,
      monotonicMs: 0,
      rows: [
        { pid: 1, name: "A", bytesIn: 10, bytesOut: 20 },
        { pid: 2, name: "B", bytesIn: 30, bytesOut: 40 },
      ],
    },
  ]);
  decoder.flush();
  assert.equal(frames.length, 1);
  decoder.end();
  decoder.end();
  assert.equal(frames.length, 2);
  assert.deepEqual(frames[1], {
    timestamp: 2000,
    monotonicMs: 1000,
    rows: [{ pid: 1, name: "A", bytesIn: 50, bytesOut: 60 }],
  });
});

test("does not flush a partial row or publish frames twice", () => {
  const frames: RawSample[] = [];
  const decoder = new NettopDecoder((frame) => frames.push(frame));
  decoder.push(",bytes_in,bytes_out,\nA.1,1");
  decoder.flush();
  assert.equal(frames.length, 0);
  decoder.push("0,20,\n");
  decoder.flush();
  assert.equal(frames.length, 0);
  decoder.push(",bytes_in,bytes_out,\nA.1,30,40,\n");
  assert.equal(frames.length, 1);
  decoder.end();
  assert.equal(frames.length, 2);
  assert.equal(frames[0].rows[0].bytesIn, 10);
});

test("rejects changed headers and invalid counters rather than showing zero traffic", () => {
  for (const csv of [
    ",download,upload,\n",
    ",bytes_in,bytes_out,\nA.1,-1,2,\n",
    ",bytes_in,bytes_out,\nA.1,,2,\n",
    ",bytes_in,bytes_out,\nA.1,9007199254740992,2,\n",
  ]) {
    assert.throws(() => new NettopDecoder(() => undefined).push(csv));
  }
});

test("parses spaced process paths, UID and launch identity", () => {
  const result = parseProcesses(
    " 101 100 501 Fri Oct 16 10:00:00 2026 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome\n",
  );
  assert.equal(result.get(101)?.uid, 501);
  assert.equal(result.get(101)?.executable, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  assert.throws(() => parseProcesses("broken output"));
});

test("attributes helpers to the outer app and command-line children through their parent", () => {
  assert.equal(outerAppPath(helper.executable), appPath);
  assert.equal(outerAppPath("Browser Helper"), null);
  assert.equal(attributeProcess(counters(101, 10), processes, catalog, 501).name, "My Browser");
  assert.equal(attributeProcess(counters(102, 10), processes, catalog, 501).id, appPath);
});

test("does not attribute shared WebKit networking to an arbitrary parent", () => {
  const webkit = info(
    103,
    "/System/Library/Frameworks/WebKit.framework/XPCServices/com.apple.WebKit.Networking.xpc/Contents/MacOS/com.apple.WebKit.Networking",
    100,
  );
  const result = attributeProcess(counters(103, 10), new Map([...processes, [103, webkit]]), catalog, 501);
  assert.equal(result.identity.kind, "process");
  assert.equal(result.isSystem, true);
  assert.match(result.name, /Safari, Mail/);
});

test("guards against parent cycles and crossing user boundaries", () => {
  const cyclic = new Map([
    [10, info(10, "/usr/bin/a", 11)],
    [11, info(11, "/usr/bin/b", 10)],
  ]);
  assert.equal(attributeProcess(counters(10, 0), cyclic, catalog, 501).identity.kind, "process");
  const other = info(200, "/usr/bin/worker", 100, 0);
  assert.equal(
    attributeProcess(counters(200, 0), new Map([...processes, [200, other]]), catalog, 501).identity.kind,
    "process",
  );
});

test("shows user-facing system apps while keeping macOS infrastructure hidden", () => {
  const mail = info(110, "/System/Applications/Mail.app/Contents/MacOS/Mail");
  const finder = info(111, "/System/Library/CoreServices/Finder.app/Contents/MacOS/Finder");
  const pids = new Map([
    [110, mail],
    [111, finder],
  ]);
  assert.equal(attributeProcess(counters(110, 0), pids, catalog, 501).isSystem, false);
  assert.equal(attributeProcess(counters(111, 0), pids, catalog, 501).isSystem, true);
});

test("mixed-ownership helpers never enable quit actions for system processes", () => {
  const rootHelper = { ...helper, uid: 0 };
  const pids = new Map([
    [100, main],
    [101, rootHelper],
  ]);
  const session = new UsageSession();
  session.ingest(sample(0, [counters(100, 0), counters(101, 0)]), pids, catalog, 501);
  const result = session.ingest(sample(2000, [counters(100, 2000), counters(101, 2000)]), pids, catalog, 501);
  assert.ok(result);
  assert.equal(canQuitApp(result.apps[0]), false);
});

test("baseline discards lifetime counters, uses elapsed time and sums helpers", () => {
  const session = new UsageSession();
  assert.equal(
    session.ingest(sample(0, [counters(100, 100000), counters(101, 200000)]), processes, catalog, 501),
    null,
  );
  const result = session.ingest(
    sample(2000, [counters(100, 102000, 200), counters(101, 204000, 400)]),
    processes,
    catalog,
    501,
  );
  assert.ok(result);
  assert.equal(result.apps.length, 1);
  assert.equal(result.apps[0].downloadBps, 3000);
  assert.equal(result.apps[0].uploadBps, 300);
  assert.equal(result.apps[0].downloadedBytes, 6000);
  assert.equal(result.apps[0].processes.length, 2);
});

test("new PIDs, reused PIDs and counter resets cannot produce lifetime spikes", () => {
  const session = new UsageSession();
  session.ingest(sample(0, [counters(100, 500)]), processes, catalog, 501);
  const next = session.ingest(sample(2000, [counters(100, 20), counters(101, 900000)]), processes, catalog, 501);
  assert.equal(next?.apps[0].downloadBps, 0);
  const reused = new Map(processes);
  reused.set(100, { ...main, startedAt: "Fri Oct 16 11:00:00 2026" });
  const later = session.ingest(sample(4000, [counters(100, 800000), counters(101, 902000)]), reused, catalog, 501);
  assert.equal(later?.apps[0].downloadBps, 1000);
  assert.equal(sameProcess(main, reused.get(100)), false);
});

test("pauses exclude the gap while preserving session totals", () => {
  const session = new UsageSession();
  session.ingest(sample(0, [counters(100, 0)]), processes, catalog, 501);
  session.ingest(sample(2000, [counters(100, 4000)]), processes, catalog, 501);
  session.resetBaseline();
  assert.equal(session.ingest(sample(30000, [counters(100, 90000)]), processes, catalog, 501), null);
  const result = session.ingest(sample(32000, [counters(100, 92000)]), processes, catalog, 501);
  assert.equal(result?.sampledSeconds, 4);
  assert.equal(result?.apps[0].downloadedBytes, 6000);
  assert.equal(result?.apps[0].history.length, 1);
});

test("keeps departed app totals but offers no quit action", () => {
  const session = new UsageSession();
  session.ingest(sample(0, [counters(100, 0)]), processes, catalog, 501);
  session.ingest(sample(2000, [counters(100, 4000)]), processes, catalog, 501);
  const result = session.ingest(sample(4000, []), new Map(), catalog, 501);
  assert.ok(result);
  assert.equal(result.apps[0].downloadedBytes, 4000);
  assert.equal(result.apps[0].downloadBps, 0);
  assert.equal(canQuitApp(result.apps[0]), false);
});

function usage(): AppUsage {
  return {
    id: appPath,
    name: 'Browser <& "friends">',
    identity: { kind: "app", path: appPath, bundleId: "org.example.browser" },
    isSystem: false,
    note: null,
    downloadBps: 1500,
    uploadBps: 500,
    downloadedBytes: 3000,
    uploadedBytes: 1000,
    processes: [{ ...main, name: "Browser", downloadBps: 1500, uploadBps: 500 }],
    history: [
      { timestamp: 1000, downloadBps: 1000, uploadBps: 300 },
      { timestamp: 3000, downloadBps: 1500, uploadBps: 500 },
    ],
  };
}

test("protects system apps and Raycast from quit actions", () => {
  assert.equal(canQuitApp(usage()), true);
  assert.equal(canQuitApp({ ...usage(), isSystem: true }), false);
  assert.equal(canQuitApp({ ...usage(), identity: { kind: "process" } }), false);
  assert.equal(
    canQuitApp({
      ...usage(),
      identity: { kind: "app", path: "/Applications/Raycast.app", bundleId: "com.raycast.macos" },
    }),
    false,
  );
});

test("sort and visibility do not mutate session state", () => {
  const app = usage();
  const daemon = { ...usage(), id: "daemon", name: "Daemon", isSystem: true, uploadBps: 10000 };
  const apps = [app, daemon];
  assert.equal(sortApps(apps, "upload")[0].id, "daemon");
  assert.equal(apps[0], app);
  assert.deepEqual(visibleApps({ apps, startedAt: 0, timestamp: 2000, sampledSeconds: 2 }, true), [app]);
});

test("formats decimal byte and bit units consistently", () => {
  assert.equal(formatRate(1_000_000), "1.0 MB/s");
  assert.equal(formatRate(1_000_000, "bits"), "8.0 Mbps");
  assert.equal(formatRate(0), "0 B/s");
  assert.equal(formatBytes(1_500_000), "1.5 MB");
});

test("charts render zero, large rates and both appearances without invalid coordinates", () => {
  for (const appearance of ["light", "dark"] satisfies ("light" | "dark")[]) {
    for (const app of [
      usage(),
      { ...usage(), history: [], downloadBps: 0, uploadBps: 0, downloadedBytes: 0, uploadedBytes: 0 },
    ]) {
      const svg = trafficSvg({ app, units: "bytes", appearance, totalRate: 0, paused: false });
      assert.ok(!/NaN|Infinity|clipPath|dominant-baseline|<script/.test(svg));
      assert.match(svg, /font-weight="bold"/);
    }
  }
});

test("live rate reversals and quiet transitions do not reorder or remove existing rows", () => {
  const first = { ...usage(), id: "first", name: "First", downloadBps: 5000, uploadBps: 0 };
  const second = { ...usage(), id: "second", name: "Second", downloadBps: 2000, uploadBps: 0 };
  const initial = updateListLayout({ sort: "combined", order: [], revealed: [] }, [first, second], "combined", "first");
  const changed = [
    { ...first, downloadBps: 0 },
    { ...second, downloadBps: 20000 },
  ];
  const next = updateListLayout(initial, changed, "combined", "first");
  assert.equal(next, initial, "Sampling alone must not create a new layout");
  assert.deepEqual(
    orderApps(changed, next).map((app) => app.id),
    ["first", "second"],
  );
  assert.ok(next.revealed.includes("first"), "The selected quiet row must remain in the same section");
  assert.equal(orderApps(changed, next)[1].downloadBps, 20000, "Displayed rates must remain live");
});

test("explicit sorting uses fresh rates and retains the selected quiet app", () => {
  const first = { ...usage(), id: "first", name: "First", downloadBps: 0, uploadBps: 0 };
  const second = { ...usage(), id: "second", name: "Second", downloadBps: 10000, uploadBps: 0 };
  const initial: ListLayout = { sort: "combined", order: ["first", "second"], revealed: ["first", "second"] };
  const next = updateListLayout(initial, [first, second], "combined", "first", true);
  assert.deepEqual(next.order, ["second", "first"]);
  assert.ok(next.revealed.includes("first"));
  const byUpload = updateListLayout(initial, [{ ...first, uploadBps: 100 }, second], "upload", "first");
  assert.deepEqual(byUpload.order, ["first", "second"]);
});

test("new active apps appear without reshuffling existing rows", () => {
  const first = { ...usage(), id: "first" };
  const initial = updateListLayout({ sort: "combined", order: [], revealed: [] }, [first], "combined", "first");
  const newcomer = { ...usage(), id: "new", downloadBps: 100000 };
  const next = updateListLayout(initial, [newcomer, first], "combined", "first");
  assert.deepEqual(next.order, ["first", "new"]);
  assert.ok(next.revealed.includes("new"));
});

test("chart history advances by a fixed distance instead of stretching earlier points", () => {
  assert.equal(chartX(10000, 10000), 464);
  assert.equal(chartX(0, 120000), 16);
  const movement = chartX(10000, 30000) - chartX(10000, 32000);
  assert.ok(Math.abs(movement - (448 * 2000) / 120000) < 0.001);
  const gapBefore = chartX(20000, 30000) - chartX(10000, 30000);
  const gapAfter = chartX(20000, 32000) - chartX(10000, 32000);
  assert.ok(Math.abs(gapBefore - gapAfter) < 0.001);
});

test("chart axes stay unchanged for small peak changes and icons use SVG paths", () => {
  const history = (rate: number) => [{ timestamp: 1000, downloadBps: rate, uploadBps: 0 }];
  assert.equal(chartScale(history(1250)), 2000);
  assert.equal(chartScale(history(1800)), 2000);
  assert.equal(chartScale(history(2100)), 5000);
  const svg = trafficSvg({ app: usage(), units: "bytes", appearance: "dark", totalRate: 2000, paused: false });
  assert.ok(!/[↓↑]/.test(svg));
  assert.match(svg, /stroke-linecap="round"/);
  assert.match(svg, /font-family="Menlo, monospace"/);
});

test("chart transitions keep the same measured endpoints and finish without looping", () => {
  const options = {
    app: usage(),
    units: "bytes",
    appearance: "dark",
    totalRate: 2000,
    paused: false,
  } satisfies Parameters<typeof trafficSvg>[0];
  const still = trafficSvg(options);
  const animated = trafficSvg({ ...options, animate: true });
  const geometry = (svg: string) => [...svg.matchAll(/<(?:polyline|polygon|circle) [^>]+/g)].map(([tag]) => tag);
  assert.deepEqual(geometry(animated), geometry(still), "Animation must not invent extra traffic samples");
  assert.equal((animated.match(/<animateTransform /g) ?? []).length, 1);
  assert.match(animated, /from="7\.47 0" to="0 0" dur="0\.2s" fill="freeze"/);
  assert.ok(!animated.includes("repeatCount"));
  assert.match(trafficMarkdown(options), /\?raycast-width=480&raycast-height=390\)$/);
});

test("paused, disabled, initial, and interrupted charts do not animate", () => {
  const app = usage();
  for (const options of [
    { app, paused: true, animate: true },
    { app, paused: false, animate: false },
    { app: { ...app, history: app.history.slice(0, 1) }, paused: false, animate: true },
    {
      app: { ...app, history: [app.history[0], { ...app.history[1], timestamp: 30_000 }] },
      paused: false,
      animate: true,
    },
  ]) {
    const svg = trafficSvg({ ...options, units: "bytes", appearance: "light", totalRate: 2000 });
    assert.ok(!svg.includes("<animate"));
    assert.ok(!/NaN|Infinity/.test(svg));
  }
});
