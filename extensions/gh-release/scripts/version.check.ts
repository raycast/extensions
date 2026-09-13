import assert from "node:assert/strict";
import { nextTag } from "../src/version.ts";

assert.equal(nextTag("v4.0.25", "patch"), "v4.0.26");
assert.equal(nextTag("v4.0.25", "minor"), "v4.1.0");
assert.equal(nextTag("v4.0.25", "major"), "v5.0.0");
assert.equal(nextTag("1.2.3", "patch"), "1.2.4");       // no v prefix preserved
assert.equal(nextTag("v2.9.9", "minor"), "v2.10.0");    // no decimal rollover
assert.equal(nextTag("", "patch"), "v0.0.1");           // repo with no releases
assert.equal(nextTag("   ", "patch"), "v0.0.1");        // whitespace counts as none
assert.equal(nextTag("nightly", "patch"), null);        // refuse non-semver
assert.equal(nextTag("release-2024", "major"), null);
assert.equal(nextTag("v1.4.2fix", "patch"), null);       // suffix must not be dropped
assert.equal(nextTag("v1.4.2.5", "patch"), null);        // four segments isn't semver
assert.equal(nextTag("v1.2.3-beta.1", "patch"), null);   // prerelease needs a manual call
assert.equal(nextTag("1.2", "patch"), null);             // too few segments
console.log("version.check ok");
