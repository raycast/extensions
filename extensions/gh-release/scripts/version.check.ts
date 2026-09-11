import assert from "node:assert/strict";
import { nextTag } from "../src/version.ts";

assert.equal(nextTag("v4.0.25", "patch"), "v4.0.26");
assert.equal(nextTag("v4.0.25", "minor"), "v4.1.0");
assert.equal(nextTag("v4.0.25", "major"), "v5.0.0");
assert.equal(nextTag("1.2.3", "patch"), "1.2.4");       // no v prefix preserved
assert.equal(nextTag("v2.9.9", "minor"), "v2.10.0");    // no decimal rollover
assert.equal(nextTag("", "patch"), "v0.0.1");           // repo with no releases
assert.equal(nextTag("nightly", "patch"), "v0.0.1");    // non-semver tag
console.log("version.check ok");
