// Regression test for the Quick Look preview helper.
//
// Bug: qlmanage hangs forever on some files (every .zip in a real Downloads
// folder). The helper resolved after a 1s timeout but never killed the child,
// so each previewed file leaked an orphaned qlmanage process and its temp dir.
//
// The timeout case runs a fake qlmanage that writes its pid and then sleeps, so
// the test exercises the timeout itself instead of depending on whichever Quick
// Look providers happen to be installed. Tracking that pid means the test only
// ever looks at the child it started.
//
// Run: npm run test:quicklook

import { execFileSync } from "child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { getQuickLookPreviewDataUrl, isQuickLookPreviewSupported } = require("../.test-build/quicklook.cjs");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
};

let failures = 0;
const fail = (message) => {
  console.error(`FAIL: ${message}`);
  failures++;
};

// The UI skips these types, so the helper should never be reached for them.
for (const name of ["archive.zip", "NOTEBOOK.IPYNB"]) {
  if (isQuickLookPreviewSupported(name)) {
    fail(`${name} should not be previewed`);
  }
}
for (const name of ["photo.png", "report.docx", "noextension"]) {
  if (!isQuickLookPreviewSupported(name)) {
    fail(`${name} should be previewed`);
  }
}

const workDir = mkdtempSync(join(tmpdir(), "ql-test-"));

// A controlled child that never exits on its own. It records its pid before
// replacing itself with sleep, so the pid stays the same.
const fakeBin = join(workDir, "bin");
const pidFile = join(workDir, "child.pid");
mkdirSync(fakeBin);
writeFileSync(join(fakeBin, "qlmanage"), `#!/bin/sh\necho $$ > "${pidFile}"\nexec sleep 300\n`, { mode: 0o755 });

const realPath = process.env.PATH;
process.env.PATH = `${fakeBin}:${realPath}`;

// An unsupported type must resolve without starting a process at all.
const unsupportedStarted = Date.now();
const unsupported = await getQuickLookPreviewDataUrl(join(workDir, "archive.zip"));
const unsupportedElapsed = Date.now() - unsupportedStarted;
await sleep(200);

if (unsupported !== null) {
  fail(`expected a zip to resolve to null, got ${unsupported.length} bytes`);
}
if (unsupportedElapsed > 500) {
  fail(`a zip took ${unsupportedElapsed}ms, it should not reach qlmanage`);
}
if (existsSync(pidFile)) {
  fail("a zip started a qlmanage process");
}

const started = Date.now();
const preview = await getQuickLookPreviewDataUrl(join(workDir, "hangs.pdf"));
const elapsed = Date.now() - started;
await sleep(300);

let childPid = null;
try {
  childPid = Number(readFileSync(pidFile, "utf8").trim());
} catch {
  fail("the fake qlmanage never started, so the timeout was not exercised");
}

if (preview !== null) {
  fail(`expected a timed out preview to resolve to null, got ${preview.length} bytes`);
}
if (elapsed < 900) {
  fail(`preview resolved in ${elapsed}ms without reaching the 1000ms timeout`);
}
if (elapsed > 5000) {
  fail(`preview took ${elapsed}ms, the timeout did not apply`);
}
if (childPid !== null && isAlive(childPid)) {
  fail(`the timed out child (pid ${childPid}) is still running`);
  try {
    process.kill(childPid, "SIGKILL");
  } catch {
    /* already gone */
  }
}

// The happy path must still produce an inline image, using the real qlmanage.
process.env.PATH = realPath;

const imageFile = join(workDir, "ok.png");
execFileSync("sips", [
  "-s",
  "format",
  "png",
  "/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericDocumentIcon.icns",
  "--out",
  imageFile,
]);
const imagePreview = await getQuickLookPreviewDataUrl(imageFile);

if (!imagePreview?.startsWith("data:image/png;base64,")) {
  fail(`expected a PNG data url, got ${imagePreview === null ? "null" : "something else"}`);
}

console.log(`zip case: ${unsupportedElapsed}ms -> ${unsupported === null ? "null" : `${unsupported.length} bytes`}`);
console.log(`timeout case: ${elapsed}ms -> ${preview === null ? "null" : `${preview.length} bytes`}`);
console.log(`png case: -> ${imagePreview?.length ?? 0} bytes`);

rmSync(workDir, { recursive: true, force: true });

if (failures > 0) {
  process.exit(1);
}
console.log("PASS: a timed out preview leaves no child behind, and a png still previews");
