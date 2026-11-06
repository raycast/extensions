/**
 * Refreshes src/lib/config-docs.json, the bundled snapshot of Otty's
 * configuration reference that Otty Settings uses until (and unless) the live
 * page loads. Runs before every Store publish (the "publish" script), the same
 * way raycast-reader syncs its model list.
 *
 * - Fails closed when either page can't be fetched or parsed: a publish that
 *   can't prove the snapshot is current should not go out.
 * - If the snapshot changed, writes it and STOPS the publish, so the change is
 *   reviewed and gets a CHANGELOG line. Run `npm run publish` again after.
 * - `--write` (npm run update-config-docs) writes without stopping.
 *
 * Uses the extension's own parser: Node 22 runs src/lib/settings.ts directly.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { diffDocs, parseConfigReference } from "../src/lib/settings.ts";

const REFERENCE_URL = "https://docs.otty.sh/reference/configuration";
const CHANGELOG_URL = "https://docs.otty.sh/changelog";
// The reference documented 200 keys on 2026-10-22; far fewer means the page
// layout changed and the parser no longer matches it.
const MINIMUM_KEYS = 150;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const snapshotPath = join(root, "src/lib/config-docs.json");
const writeOnly = process.argv.includes("--write");

function fail(message) {
  console.error(`\n✖ Otty config docs: ${message}\n`);
  process.exit(1);
}

async function fetchText(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    fail(
      `couldn't fetch ${url} (${error.message}), so the bundled snapshot can't be checked. Publish again when online.`,
    );
  }
}

const [referenceHtml, changelogHtml] = await Promise.all([
  fetchText(REFERENCE_URL),
  fetchText(CHANGELOG_URL),
]);

const parsed = parseConfigReference(referenceHtml);
if (parsed.size < MINIMUM_KEYS) {
  fail(
    `the reference parsed to only ${parsed.size} keys (expected at least ${MINIMUM_KEYS}); its layout probably changed. Fix parseConfigReference before publishing.`,
  );
}
// The changelog's first version heading is the release the docs describe.
const docsVersion = changelogHtml
  .replace(/<[^>]+>/g, " ")
  .match(/\b(\d+\.\d+\.\d+)\b/)?.[1];
if (!docsVersion) fail(`couldn't find a version in ${CHANGELOG_URL}.`);

const settings = Object.fromEntries(
  [...parsed.entries()].sort(([a], [b]) => a.localeCompare(b)),
);
const next = { source: REFERENCE_URL, docsVersion, settings };
const nextText = `${JSON.stringify(next, null, 2)}\n`;

let previous = { docsVersion: "none", settings: {} };
try {
  previous = JSON.parse(readFileSync(snapshotPath, "utf8"));
} catch {
  // First run: no snapshot yet.
}
const previousText = (() => {
  try {
    return readFileSync(snapshotPath, "utf8");
  } catch {
    return "";
  }
})();

if (previousText === nextText) {
  console.log(
    `✓ Otty config docs: snapshot is current (${parsed.size} keys, Otty ${docsVersion}).`,
  );
  process.exit(0);
}

writeFileSync(snapshotPath, nextText);
const { added, removed, changed } = diffDocs(previous.settings, settings);
const list = (label, keys) =>
  keys.length ? `\n  ${label} (${keys.length}): ${keys.join(", ")}` : "";
const summary =
  `snapshot updated, Otty ${previous.docsVersion} → ${docsVersion}, ${parsed.size} keys.` +
  list("added", added) +
  list("removed", removed) +
  list("changed", changed);

if (writeOnly) {
  console.log(`✓ Otty config docs: ${summary}`);
} else {
  fail(
    `${summary}\n\n  Review src/lib/config-docs.json, add a CHANGELOG line, then run \`npm run publish\` again.`,
  );
}
