import assert from "node:assert/strict";
import test from "node:test";
import { operationMessage } from "../src/application/operation-message";

test("renders unavailable and permission recovery rather than an opaque unavailable label", () => {
  assert.equal(
    operationMessage({ status: "unavailable", reason: "Helper is unsigned.", recovery: "Install a signed helper." }),
    "Helper is unsigned. Install a signed helper.",
  );
  assert.equal(
    operationMessage({
      status: "permission_required",
      permission: "Input Monitoring",
      recovery: "Approve it in System Settings.",
    }),
    "Input Monitoring: Approve it in System Settings.",
  );
});
