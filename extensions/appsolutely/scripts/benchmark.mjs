import { performance } from "node:perf_hooks";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// The optional baseline directory should contain a checkout of the comparison revision.
const currentDirectory = resolve(process.cwd());
const baselineDirectory = process.argv[2] && resolve(process.argv[2]);
const appCount = 500;
const lookupRounds = 20;
const sampleCount = 9;
const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

async function load(directory) {
  const importFile = (file) => import(pathToFileURL(resolve(directory, file)).href);
  const [model, icons] = await Promise.all([
    importFile("src/services/application-model.ts"),
    importFile("src/services/application-icon-store.ts"),
  ]);
  return { assignmentFor: model.assignmentFor, Store: icons.ApplicationIconStore };
}

const current = await load(currentDirectory);
const baseline = baselineDirectory ? await load(baselineDirectory) : undefined;
const apps = Array.from({ length: appCount }, (_, index) => ({
  name: `App ${index}`,
  path: `/Applications/App ${index}.app`,
  id: `path:/Applications/App ${index}.app`,
  stableId: `bundle:app.${index}`,
  hasMultipleInstallations: false,
  isPreferredInstallation: true,
}));
const state = {
  version: 1,
  folders: [],
  assignments: apps.map((app, order) => ({ appId: app.stableId, folderId: "folder", order })),
};
let checksum = 0;
function lookupSample(implementation) {
  const started = performance.now();
  for (let round = 0; round < lookupRounds; round++) {
    for (const app of apps) checksum += implementation.assignmentFor(app, state)?.order ?? 0;
  }
  return performance.now() - started;
}

async function iconSample(implementation) {
  let calls = 0;
  let notifications = 0;
  const store = new implementation.Store(async (path) => {
    calls++;
    await delay(1);
    return `/cache/${path}.png`;
  });
  const paths = Array.from({ length: 40 }, (_, index) => `App${index}`);
  const unsubscribe = store.subscribe(() => notifications++);
  const release = store.acquire(paths);
  const deadline = performance.now() + 10000;
  while (paths.some((path) => !store.getSnapshot().has(path))) {
    if (performance.now() > deadline) throw new Error("Icon loading timed out");
    await delay(2);
  }
  // Allow any batched notifications to run before measuring the next interaction.
  await delay(40);
  const coldNotifications = notifications;
  release();
  calls = 0;
  notifications = 0;
  const revisit = store.acquire(paths);
  await delay(100);
  const result = { coldNotifications, revisitLoads: calls, revisitNotifications: notifications };
  revisit();
  unsubscribe();
  return result;
}

// Alternate the order to reduce drift between runs; warm both implementations first.
lookupSample(current);
if (baseline) lookupSample(baseline);
const currentSamples = [];
const baselineSamples = [];
for (let index = 0; index < sampleCount; index++) {
  if (baseline && index % 2 === 0) baselineSamples.push(lookupSample(baseline));
  currentSamples.push(lookupSample(current));
  if (baseline && index % 2 !== 0) baselineSamples.push(lookupSample(baseline));
}
const currentResult = { lookupMs: median(currentSamples), ...(await iconSample(current)) };
const baselineResult = baseline && { lookupMs: median(baselineSamples), ...(await iconSample(baseline)) };
const format = (value) => (typeof value === "number" ? value.toFixed(3) : String(value));
const rows = [
  ["Assignment lookup (10,000 calls), ms", "lookupMs"],
  ["Cold icon notifications (40 icons)", "coldNotifications"],
  ["Icon loads on revisit", "revisitLoads"],
  ["Icon notifications on revisit", "revisitNotifications"],
];
const table = [
  `| Metric | Current${baselineResult ? " | Baseline" : ""} |`,
  `| --- | ---:${baselineResult ? " | ---:" : ""} |`,
  ...rows.map(
    ([label, key]) =>
      `| ${label} | ${format(currentResult[key])}${baselineResult ? ` | ${format(baselineResult[key])}` : ""} |`,
  ),
].join("\n");
console.log(table);
console.log(
  `Lookup median from ${sampleCount} samples; checksum: ${checksum}. Icon loader uses a 1 ms simulated delay.`,
);
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFile } = await import("node:fs/promises");
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Launcher performance benchmark\n\n${table}\n\n`);
}

if (baselineResult) {
  const failures = [];
  // A fixed allowance prevents sub-millisecond measurements from failing on runner noise.
  const lookupLimit = Math.max(baselineResult.lookupMs * 3, baselineResult.lookupMs + 5);
  if (currentResult.lookupMs > lookupLimit) failures.push(`lookup exceeded ${lookupLimit.toFixed(3)} ms`);
  // Revisit loads are independent of notification batching and runner timing.
  if (currentResult.revisitLoads > baselineResult.revisitLoads) failures.push("icon loads on revisit increased");
  if (failures.length) {
    console.error(`Performance regression: ${failures.join("; ")}`);
    process.exitCode = 1;
  }
}
