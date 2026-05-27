import { test } from "node:test";
import * as assert from "node:assert/strict";
import { compareVersion, hasUpdate, parseVersion, shortenVersion } from "../src/utils/version";

test("parseVersion strips v-prefix and noise suffixes", () => {
  assert.equal(parseVersion("v1.2.3", "").version, "1.2.3");
  assert.equal(parseVersion("1.0-beta", "").version, "1.0");
  assert.equal(parseVersion("Build 100", "").version, "100");
  assert.equal(parseVersion("1.2.3.osx", "").version, "1.2.3");
  assert.equal(parseVersion("1.0-stable", "").version, "1.0");
});

test("parseVersion extracts build numbers from parens and prefixes", () => {
  assert.equal(parseVersion("1.0", "1.0 (1234)").build, "1234");
  assert.equal(parseVersion("1.0", "IU-9876").build, "9876");
  assert.equal(parseVersion("1.0", "2.0/312").build, "312");
});

test("compareVersion handles numeric ordering", () => {
  assert.equal(compareVersion("1.0.0", "1.0.0"), 0);
  assert.equal(compareVersion("1.0.1", "1.0.0"), 1);
  assert.equal(compareVersion("1.0.0", "1.0.1"), -1);
  assert.equal(compareVersion("2.0", "1.99"), 1);
  assert.equal(compareVersion("10.0", "9.0"), 1, "10 > 9 numerically not lexically");
});

test("compareVersion tolerates trailing zero padding", () => {
  assert.equal(compareVersion("1.2", "1.2.0"), 0);
  assert.equal(compareVersion("1.2.0.0", "1.2"), 0);
});

test("hasUpdate uses build number when both sides have meaningful ones", () => {
  // Both have a build number distinct from the version → compare builds
  assert.equal(hasUpdate("1.0", "100", "1.0", "101"), true);
  assert.equal(hasUpdate("1.0", "101", "1.0", "100"), false);
  assert.equal(hasUpdate("1.0", "100", "1.0", "100"), false);
});

test("hasUpdate falls back to version when builds match", () => {
  // Build equal → fall through to version compare
  assert.equal(hasUpdate("1.0.0", "100", "1.0.1", "100"), true);
});

test("hasUpdate handles Dia-style 'shortVer (build)' duplication", () => {
  // Real case: installed shortVer="1.32.0" build="81144"
  //            latest shortVer="1.32.0" build="81144" (same, no update)
  // The sparkle parser normalises this case, but hasUpdate alone must also be correct.
  assert.equal(hasUpdate("1.32.0", "81144", "1.32.0", "81144"), false);
});

test("hasUpdate handles Google-Drive-style build-is-the-real-version", () => {
  // Real case: Google Drive reports shortVer="126.0" but CFBundleVersion="126.0.4".
  // The Homebrew cask only exposes version="126.0.4" (no separate build).
  // Pre-fix this said "update available" forever because lat.version > cur.version.
  // The build is a refinement of the version, so compare against build instead.
  assert.equal(hasUpdate("126.0", "126.0.4", "126.0.4"), false);
  // And it should still flag a real update when the cask moves forward
  assert.equal(hasUpdate("126.0", "126.0.4", "126.0.5"), true);
  assert.equal(hasUpdate("126.0", "126.0.4", "127.0.0"), true);
  // Build that doesn't refine the version (build is unrelated, e.g. 12345) →
  // compare against version like before, not the build.
  assert.equal(hasUpdate("5.0", "12345", "5.1"), true);
});

test("shortenVersion truncates long strings with ellipsis", () => {
  assert.equal(shortenVersion("1.0.0"), "1.0.0");
  assert.equal(shortenVersion("very.long.version.string", 10), "very.long…");
  assert.equal(shortenVersion(""), "");
});
