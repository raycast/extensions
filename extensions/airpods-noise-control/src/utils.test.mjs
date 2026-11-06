import assert from "node:assert/strict";
import { test } from "node:test";
import { isMacOS27OrLater } from "./utils.ts";

for (const release of ["23.6.0", "24.0.0", "25.6.0"]) {
  test(`keeps Darwin ${release} on the existing menu lookup`, () => {
    assert.equal(isMacOS27OrLater("darwin", release), false);
  });
}

for (const release of ["26.0.0", "26.1.0", "27.0.0"]) {
  test(`uses MenuBarAgent on Darwin ${release}`, () => {
    assert.equal(isMacOS27OrLater("darwin", release), true);
  });
}

for (const platform of ["linux", "win32"]) {
  test(`does not use MenuBarAgent on ${platform}`, () => {
    assert.equal(isMacOS27OrLater(platform, "26.0.0"), false);
  });
}

test("does not opt into MenuBarAgent for an unrecognized release", () => {
  assert.equal(isMacOS27OrLater("darwin", "unknown"), false);
});
