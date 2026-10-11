import { readFileSync } from "node:fs";
import { join } from "node:path";
import { collectRepo } from "./collect";
import {
  checkAssets,
  checkChangelog,
  checkDependencyHygiene,
  checkForbiddenApis,
  checkManifestMetadata,
  checkNaming,
  checkPackageLock,
  checkReadme,
  checkRootNavigationTitle,
  checkScreenshots,
  checkUsEnglish,
  partitionViolations,
  type KnownGap,
  type Violation,
} from "./rules";

const isSubmission = process.argv.includes("--submission");
const root = process.cwd();
const snapshot = collectRepo(root);

const documents = [
  ...snapshot.sources,
  ...(snapshot.readme === undefined ? [] : [{ path: "README.md", text: snapshot.readme }]),
  ...(snapshot.changelog === undefined ? [] : [{ path: "CHANGELOG.md", text: snapshot.changelog }]),
];

const violations: Violation[] = [
  ...checkManifestMetadata(snapshot.manifest),
  ...checkNaming(snapshot.manifest),
  ...checkScreenshots(snapshot.screenshots),
  ...checkChangelog(snapshot.changelog),
  ...checkReadme(snapshot.readme),
  ...checkAssets(snapshot.manifest, snapshot.assets, snapshot.sources),
  ...checkRootNavigationTitle(snapshot.manifest, snapshot.sources),
  ...checkDependencyHygiene(snapshot.manifest),
  ...checkForbiddenApis(snapshot.sources),
  ...checkUsEnglish(documents),
  ...(isSubmission ? checkPackageLock(snapshot.manifest, snapshot.packageLock) : []),
];

const gaps = JSON.parse(readFileSync(join(__dirname, "baseline.json"), "utf8")) as KnownGap[];
const { unexpected, known, resolved } = partitionViolations(violations, isSubmission ? [] : gaps);

const describe = (violation: Violation) => `  ${violation.check}  ${violation.subject}\n    ${violation.message}`;

if (known.length > 0) {
  console.log(`Known gaps (${known.length}), tracked in tools/store-check/baseline.json:`);
  for (const violation of known) console.log(describe(violation));
  console.log("");
}

if (resolved.length > 0) {
  console.log(`Fixed but still baselined (${resolved.length}). Delete these from baseline.json:`);
  for (const gap of resolved) console.log(`  ${gap.check}  ${gap.subject}`);
  console.log("");
}

if (unexpected.length > 0) {
  console.log(`Store compliance failures (${unexpected.length}):`);
  for (const violation of unexpected) console.log(describe(violation));
  console.log("\nSee .agents/store.md.");
}

const failed = unexpected.length + resolved.length;
if (failed === 0) {
  console.log(
    isSubmission
      ? "store-check passed in submission mode"
      : `store-check passed (${known.length} known gap(s))`,
  );
}
process.exit(failed === 0 ? 0 : 1);
