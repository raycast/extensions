/**
 * Runs before `ray publish` (see the "publish" script in package.json).
 *
 * 1. Fails if the installed @raycast/api is behind npm's latest: the check can only see the
 *    deprecations in the types it has.
 * 2. Fails if ai.ts, the summaryModel preference, and the test stub disagree about the models.
 * 3. Replaces every deprecated model ai.ts names with Raycast's named successor, and moves each
 *    one to the newest version of its line, in ai.ts, package.json, and the test stub.
 * 4. If it changed anything, it stops the publish so the change gets tested and a CHANGELOG
 *    line before it ships. Run `npm run publish` again once it's reviewed.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyModelUpdates, parseModelCatalog, planModelUpdates, referencedModels } from "./summary-models.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const paths = {
  types: join(root, "node_modules/@raycast/api/types/index.d.ts"),
  api: join(root, "node_modules/@raycast/api/package.json"),
  aiTs: join(root, "src/config/ai.ts"),
  manifest: join(root, "package.json"),
  stub: join(root, "tests/raycast-api-stub.ts"),
};

function fail(message) {
  console.error(`\n✖ Summary models: ${message}\n`);
  process.exit(1);
}

const installed = JSON.parse(readFileSync(paths.api, "utf8")).version;
// Runs npm's own JavaScript entry point under node, so it works on Windows (where `npm` is a
// `.cmd` wrapper a subprocess can't launch without a shell) and keeps the user's .npmrc proxy and
// registry settings. Outside `npm run`, there is no entry point to borrow, so ask the registry.
let latest;
try {
  const npmCli = process.env.npm_execpath;
  if (npmCli && /\.[cm]?js$/.test(npmCli)) {
    latest = execFileSync(process.execPath, [npmCli, "view", "@raycast/api", "version"], { encoding: "utf8" }).trim();
  } else {
    const response = await fetch("https://registry.npmjs.org/@raycast%2Fapi/latest", {
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    latest = (await response.json()).version;
  }
  if (typeof latest !== "string" || !latest) throw new Error("no version");
} catch {
  fail("couldn't read the latest @raycast/api version from npm, so the model list can't be checked.");
}
if (installed !== latest) {
  fail(
    `@raycast/api ${installed} is installed but ${latest} is the latest. Its model list may be out of date.\n` +
      `  Run \`npm install @raycast/api@^${latest}\`, then publish again.`,
  );
}

const catalog = parseModelCatalog(readFileSync(paths.types, "utf8"));
const aiTs = readFileSync(paths.aiTs, "utf8");
const manifest = JSON.parse(readFileSync(paths.manifest, "utf8"));
const stub = readFileSync(paths.stub, "utf8");
const listed = [...aiTs.matchAll(/\{ key: "([^"]+)", title: "([^"]+)"/g)].map((m) => ({ key: m[1], title: m[2] }));
const defaultKey = aiTs.match(/DEFAULT_SUMMARY_MODEL: SummaryModelKey = "([^"]+)"/)?.[1];
const pref = manifest.preferences.find((p) => p.name === "summaryModel");
if (!listed.length || !defaultKey || !pref) {
  fail("couldn't find SUMMARY_MODELS and DEFAULT_SUMMARY_MODEL in src/config/ai.ts, or summaryModel in package.json.");
}

// The script only rewrites lists that already agree; otherwise it can't tell which one is right.
const listedKeys = listed.map((m) => m.key);
const menuKeys = listedKeys.filter((k) => k !== defaultKey);
const prefKeys = pref.data.map((row) => row.value).filter((v) => v !== "default");
const defaultLabel = `Default (${listed.find((m) => m.key === defaultKey)?.title})`;
const problems = [];
if (menuKeys.join() !== prefKeys.join()) {
  problems.push(`package.json offers [${prefKeys.join(", ")}] but ai.ts offers [${menuKeys.join(", ")}].`);
}
if (pref.data[0]?.value !== "default" || pref.data[0]?.title !== defaultLabel) {
  problems.push(`the first Summary Model row should be "${defaultLabel}".`);
}
const referenced = referencedModels(aiTs);
const unstubbed = referenced.filter((k) => !stub.includes(`"${k}":`));
if (unstubbed.length) problems.push(`tests/raycast-api-stub.ts is missing ${unstubbed.join(", ")}.`);
if (problems.length) fail(`the model lists disagree. Fix these by hand:\n  ${problems.join("\n  ")}`);

let plan;
try {
  plan = planModelUpdates(catalog, referenced, listedKeys);
} catch (error) {
  fail(`${error.message}\n  Pick a replacement by hand in src/config/ai.ts and package.json.`);
}
if (!plan.length) {
  console.log(`✔ Summary models are current for @raycast/api ${installed}.`);
  process.exit(0);
}

const out = applyModelUpdates({ plan, catalog, defaultKey, aiTs, manifest, stub });
writeFileSync(paths.aiTs, out.aiTs);
writeFileSync(paths.manifest, JSON.stringify(out.manifest, null, 2) + "\n");
writeFileSync(paths.stub, out.stub);

console.error("\nSummary models updated:");
for (const { from, to, reason, duplicate } of plan) {
  const why = reason === "deprecated" ? "deprecated by Raycast" : "newer version";
  console.error(`  ${from} → ${to} (${why}${duplicate ? "; already listed, so the two rows were merged" : ""})`);
}
fail(
  "the lists changed, so the publish stopped.\n" +
    "  Review the diff, run `npm test`, and add a CHANGELOG line. Then run `npm run publish` again.",
);
