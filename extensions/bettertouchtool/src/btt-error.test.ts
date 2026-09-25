import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BttError } from "bettertouchtool";
import { getBttErrorDetails } from "./btt-error";

describe("BetterTouchTool error details", () => {
  it("includes the failed command and underlying cause", () => {
    const error = new BttError("Could not call BetterTouchTool", "trigger_named", undefined, new Error("ECONNREFUSED"));

    assert.equal(getBttErrorDetails(error), "Command: trigger_named · Cause: ECONNREFUSED");
  });

  it("does not expose command parameters", () => {
    const error = new BttError("Unauthorized", "trigger_named", { shared_secret: "secret" });

    assert.equal(getBttErrorDetails(error), "Command: trigger_named");
  });

  it("leaves unrelated errors to the default failure toast formatter", () => {
    assert.equal(getBttErrorDetails(new Error("Other failure")), undefined);
  });
});
