import assert from "node:assert/strict";
import test from "node:test";
import { companionReleasePlan } from "../scripts/companion-release-plan";

test("build-only runs can validate the published version without signing it again", () => {
  assert.equal(companionReleasePlan("1.0.1", "1.0.1", true).tag, "companion-v1.0.1");
});
test("signing requires a strictly newer numeric version before contacting Mozilla", () => {
  for (const version of ["1.0.0", "1.0.1", "1.0.1.0"]) {
    assert.throws(() => companionReleasePlan(version, "1.0.1", false), /Increase/);
  }
  assert.equal(companionReleasePlan("1.0.10", "1.0.9", false).version, "1.0.10");
  assert.equal(companionReleasePlan("1.0.1.1", "1.0.1", false).version, "1.0.1.1");
});
test("release paths accept only manifest versions and preserve the public download layout", () => {
  for (const version of ["../../secret", "1.0.2\ncontents=write", "$(echo bad)"]) {
    assert.throws(() => companionReleasePlan(version, "1.0.1", false), /Invalid/);
  }
  assert.equal(
    companionReleasePlan("1.0.2", "1.0.1", false).url,
    "https://github.com/chenghsj/app-hopper/releases/download/companion-v1.0.2/app-hopper-companion-1.0.2.xpi",
  );
});
