import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runGatekeeperHelper } from "../src/automation";

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
});
