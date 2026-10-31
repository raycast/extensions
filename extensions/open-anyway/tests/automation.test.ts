import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runGatekeeperHelper, isTargetMatching } from "../src/automation";

describe("isTargetMatching", () => {
  it("returns true for exact valid target match", () => {
    assert.equal(isTargetMatching("Example", "Example"), true);
    assert.equal(isTargetMatching("Example", "example"), true);
    assert.equal(isTargetMatching("  Example  ", "example"), true);
  });

  it("handles .app extension suffix normalization", () => {
    assert.equal(isTargetMatching("Example.app", "Example"), true);
    assert.equal(isTargetMatching("Example", "Example.app"), true);
    assert.equal(isTargetMatching("Example.app", "Example.app"), true);
  });

  it("rejects substring matches where one name is contained in the other", () => {
    assert.equal(isTargetMatching("Example", "Example Helper"), false);
    assert.equal(isTargetMatching("Example Helper", "Example"), false);
    assert.equal(isTargetMatching("Code", "VSCode"), false);
    assert.equal(isTargetMatching("VSCode", "Code"), false);
  });

  it("rejects similar names belonging to different applications", () => {
    assert.equal(isTargetMatching("App", "Application"), false);
    assert.equal(isTargetMatching("Tool", "Toolbar"), false);
  });

  it("rejects missing, empty, or unresolvable targets", () => {
    assert.equal(isTargetMatching(undefined, "Example"), false);
    assert.equal(isTargetMatching("Example", undefined), false);
    assert.equal(isTargetMatching("", "Example"), false);
    assert.equal(isTargetMatching("Example", ""), false);
    assert.equal(isTargetMatching("   ", "Example"), false);
    assert.equal(isTargetMatching(undefined, undefined), false);
  });
});

describe("runGatekeeperHelper", () => {
  it("checks accessibility permission successfully", async () => {
    const res = await runGatekeeperHelper("--check-permission");
    assert.ok(res);
    assert.ok(typeof res.trusted === "boolean");
    assert.ok(["trusted", "untrusted"].includes(res.status));
  });

  it("handles detect mode and returns structured response", async () => {
    const res = await runGatekeeperHelper("--detect");
    assert.ok(res);
    assert.ok(["detected", "confirmation_pending", "not_found", "permission_denied"].includes(res.status));
    assert.ok(typeof res.message === "string");
  });

  it("accepts targetApp parameter without throwing", async () => {
    const res = await runGatekeeperHelper("--detect", "NonExistentApp");
    assert.ok(res);
    assert.ok(["detected", "confirmation_pending", "not_found", "permission_denied"].includes(res.status));
  });

  it("verifies target matching via native helper --test-target mode", async () => {
    const matchRes = await runGatekeeperHelper("--test-target", "TestApp", 8000, ["--detected", "TestApp"]);
    assert.equal(matchRes.status, "match");

    const substringRes = await runGatekeeperHelper("--test-target", "TestApp", 8000, [
      "--detected",
      "TestApp Helper",
    ]);
    assert.equal(substringRes.status, "mismatch");

    const mismatchRes = await runGatekeeperHelper("--test-target", "AppA", 8000, ["--detected", "AppB"]);
    assert.equal(mismatchRes.status, "mismatch");
  });
});
