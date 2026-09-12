// Guard: server/settings-platform.js does not keep a static darwin browser
// list at all — detectBrowsersDarwin scans /Applications for any bundle
// whose Info.plist claims the http/https URL scheme, so "the server's list"
// is really an algorithm, not an array to diff against. The closest lockstep
// check achievable here: build a fixture .app bundle for every name in the
// extension's MAC_BROWSER_CANDIDATES, tell each one's (faked) Info.plist to
// claim http/https, and assert detectBrowsersDarwin recognizes exactly that
// set back. This catches typos/renames in the extension's list; it cannot
// catch a real-world browser missing from both lists, since the server side
// has no fixed list to diff against (see the report's future-improvement
// note: fetch GET /api/settings's live `browsers` field instead of guessing).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { MAC_BROWSER_CANDIDATES } from "../src/lib/showmd.ts";
import { detectBrowsers } from "../../../server/settings-platform.js";

test("MAC_BROWSER_CANDIDATES matches what server/settings-platform.js's darwin scan would detect", async () => {
  const fakeApps = mkdtempSync(path.join(tmpdir(), "showmd-browser-guard-"));
  try {
    for (const name of MAC_BROWSER_CANDIDATES) {
      mkdirSync(path.join(fakeApps, `${name}.app`, "Contents"), { recursive: true });
    }
    const readPlist = async () => ({
      CFBundleURLTypes: [{ CFBundleURLSchemes: ["https"] }],
    });
    const result = await detectBrowsers({ platform: "darwin", appDirs: [fakeApps], readPlist });
    assert.deepEqual(
      [...result].sort(),
      ["default", ...MAC_BROWSER_CANDIDATES].sort(),
    );
  } finally {
    rmSync(fakeApps, { recursive: true, force: true });
  }
});
