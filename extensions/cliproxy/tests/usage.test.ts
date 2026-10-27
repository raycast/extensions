import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { accountRates, DAY, drainHistory, forecast, HOUR, hourlyUsage, Observation, remainingHistory, usageIntervals } from "../src/usageModel";
import { HistoryStore } from "../src/historyStore";
import { usageChartSvg } from "../src/usageChart";

const start = Date.UTC(2026, 9, 26);
function sample(at: number, left: number, account = "a", resetsAt: number | null = start + 7 * DAY): Observation {
  return { at: start + at * HOUR, left, account, provider: "codex", label: "Weekly", resetsAt };
}

test("hourly drain weights unequal sampling intervals by observed time", () => {
  const values = [sample(0, 100), sample(0.25, 95), sample(1, 50)];
  const [rate] = accountRates(values, start, start + HOUR);
  assert.equal(rate.rate, 50);
  assert.equal(rate.observedMs, HOUR);
  const [hour] = hourlyUsage(values, start, start + HOUR).get("a")!;
  assert.equal(hour.rate, 50);
  assert.equal(hour.used, 50);
});

test("intervals crossing clock hours are split proportionally", () => {
  const values = [sample(55 / 60, 80), sample(65 / 60, 70)];
  const hours = hourlyUsage(values, start, start + 2 * HOUR).get("a")!;
  assert.equal(hours.length, 2);
  assert.equal(hours[0].used, 5);
  assert.equal(hours[1].used, 5);
  assert.equal(hours[0].rate, 60);
});

test("resets, refills, long gaps, and unknown reset windows cannot become consumption", () => {
  assert.equal(usageIntervals([sample(0, 10), sample(0.25, 100)]).length, 0);
  assert.equal(usageIntervals([sample(0, 100), sample(0.25, 90, "a", start + 14 * DAY)]).length, 0);
  assert.equal(usageIntervals([sample(0, 100), sample(2, 50)]).length, 0);
  assert.equal(usageIntervals([sample(0, 100, "a", null), sample(0.25, 90, "a", null)]).length, 0);
  assert.equal(usageIntervals([sample(0, 50), sample(0.25, 50)]).length, 1);
});

test("provider drain has a gap when one account has no observations", () => {
  const values = [sample(0, 100), sample(0.5, 90)];
  assert.equal(drainHistory(values, ["a", "b"], start, start + HOUR)[0].value, null);
  assert.equal(drainHistory(values, ["a"], start, start + HOUR)[0].value, 20);
  assert.equal(remainingHistory([sample(0, 100), sample(2, 80)], ["a"], start)[1].value, null);
});

test("forecast clamps each account and applies staggered reset refills for exactly seven days", () => {
  const current = [sample(0, 10, "a", start + HOUR), sample(0, 20, "b", start + 2 * HOUR)];
  const rates = current.map((o) => ({ account: o.account, rate: 20, observedMs: HOUR, intervals: 4 }));
  const points = forecast(current, rates, start)!;
  assert.equal(points.at(-1)!.at, start + 7 * DAY);
  assert.deepEqual(points.filter((p) => p.at === start + HOUR).map((p) => p.value), [0, 100]);
  assert.deepEqual(points.filter((p) => p.at === start + 2 * HOUR).map((p) => p.value), [80, 180]);
  assert.ok(points.every((p) => p.value! >= 0 && p.value! <= 200));
});

test("forecast waits for measured history on every current account, including zero drain", () => {
  const current = [sample(0, 100)];
  assert.equal(forecast(current, [], start), null);
  assert.equal(forecast(current, [{ account: "a", rate: 1, observedMs: HOUR / 2, intervals: 4 }], start), null);
  assert.equal(forecast(current, [{ account: "a", rate: 0, observedMs: HOUR, intervals: 4 }], start)![0].value, 100);
  assert.equal(forecast(current, [{ account: "a", rate: 1, observedMs: HOUR, intervals: 4 }], start + 2 * HOUR), null);
});

test("history writes survive concurrent samplers, malformed files, restart and retention", async () => {
  const directory = await mkdtemp(join(tmpdir(), "cliproxy-history-test-"));
  try {
    const store = new HistoryStore(directory);
    await Promise.all([store.append([sample(0, 100)], start), store.append([sample(0.25, 95)], start)]);
    assert.equal((await new HistoryStore(directory).read(start + HOUR)).length, 2);
    await writeFile(join(directory, String(start / DAY), "broken.json"), "{");
    await writeFile(join(directory, String(start / DAY), "unfinished.tmp"), "{");
    assert.equal((await store.read(start + HOUR)).length, 2);
    const old = String(Math.floor(start / DAY) - 30);
    await mkdir(join(directory, old));
    await store.append([sample(1, 90)], start + HOUR);
    assert.ok(!(await readdir(directory)).includes(old));
    const file = (await readdir(join(directory, String(start / DAY)))).find((n) => n.endsWith(".json") && n !== "broken.json")!;
    assert.ok((await readFile(join(directory, String(start / DAY), file), "utf8")).includes('"left"'));
    assert.equal((await new HistoryStore(join(directory, "other-connection")).read(start + HOUR)).length, 0);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("chart output marks the forecast as dashed and preserves missing-data gaps", () => {
  const svg = usageChartSvg({ mode: "forecast", provider: "codex", label: "Weekly", accounts: 1, left: 80, rate: 2, observedHours: 5, history: [{ at: start, value: 80 }], projection: [{ at: start, value: 80 }, { at: start + DAY, value: 32 }], now: start, since: start - DAY, dark: true });
  assert.match(svg, /stroke-dasharray="5 4"/);
  assert.ok(!svg.includes("NaN") && !svg.includes("Infinity"));
});

 test("forecast time ranges stop at the selected horizon", () => {
  const current = [sample(0, 70)];
  const rates = [{account:"a",rate:1,observedMs:HOUR,intervals:4}];
  for (const days of [1,3,7]) assert.equal(forecast(current,rates,start,days)!.at(-1)!.at,start+days*DAY);
 });

test("forecast marks exhaustion before an hourly endpoint", () => {
 const points = forecast([sample(0,10,"a",start+2*HOUR)],[{account:"a",rate:20,observedMs:HOUR,intervals:4}],start,1)!;
 assert.ok(points.some(p=>p.at===start+HOUR/2 && p.value===0));
});

test("history write failures stay visible over cached history in both graph modes", () => {
  for (const mode of ["forecast", "drain"] as const) {
    const svg = usageChartSvg({mode,provider:"codex",label:"Weekly",accounts:1,left:80,rate:2,observedHours:5,history:[{at:start-HOUR,value:82},{at:start,value:80}],projection:[{at:start,value:80},{at:start+DAY,value:32}],now:start,since:start-DAY,dark:true,historyError:true,message:"Couldn't save history: disk <full> & unavailable."});
    assert.ok(svg.includes("Couldn't save history: disk &lt;full&gt; &amp; unavailable."));
    assert.ok(svg.includes('<path d="M'));
    assert.ok(svg.includes('height="298"'));
  }
});

test("history read failures explain unavailability instead of asking for more samples", () => {
  for (const mode of ["forecast", "drain"] as const) {
    const svg = usageChartSvg({mode,provider:"codex",label:"Weekly",accounts:1,left:80,rate:null,observedHours:0,history:[],projection:null,now:start,since:start-DAY,dark:false,historyError:true,message:"Couldn't read history. Reload to try again."});
    assert.ok(svg.includes("Couldn't read history. Reload to try again."));
    assert.ok(svg.includes("History unavailable"));
    assert.ok(!svg.includes("Collect at least 1 observed hour") && !svg.includes("Learning your usage") && !svg.includes(">Learning<"));
  }
});
