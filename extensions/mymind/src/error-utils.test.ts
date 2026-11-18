import assert from "node:assert/strict";
import test from "node:test";
import {
  getBatchUploadFailureMessage,
  getErrorEmptyView,
  getErrorMessage,
  isReadOnlyAccessProblem,
} from "./error-utils";

test("isReadOnlyAccessProblem matches read-only API details", () => {
  assert.equal(
    isReadOnlyAccessProblem({ detail: "This key is read-only. Use a full-access key to edit this item." }),
    true,
  );
  assert.equal(isReadOnlyAccessProblem({ type: "https://api.mymind.com/problems/read-only-key" }), true);
});

test("isReadOnlyAccessProblem ignores unrelated 403 details", () => {
  assert.equal(isReadOnlyAccessProblem({ detail: "You do not have permission to access this resource." }), false);
  assert.equal(isReadOnlyAccessProblem(undefined), false);
});

test("getErrorMessage normalizes unknown errors", () => {
  assert.equal(getErrorMessage(new Error("Network unavailable"), "Fallback"), "Network unavailable");
  assert.equal(getErrorMessage("  ", "Fallback"), "Fallback");
  assert.equal(getErrorMessage(null, "Fallback"), "Fallback");
});

test("getErrorEmptyView avoids echoing the title as the description", () => {
  assert.deepEqual(getErrorEmptyView(new Error("Couldn't load your tags"), "Couldn't load your tags"), {
    title: "Couldn't load your tags",
    description: "Try again in a moment.",
  });
});

test("getBatchUploadFailureMessage keeps partial-success context", () => {
  assert.equal(
    getBatchUploadFailureMessage({
      createdCount: 2,
      duplicateCount: 1,
      failureCount: 1,
      firstFailureMessage: "The fourth file timed out.",
    }),
    "2 uploaded, 1 already existed, 1 failed. The fourth file timed out.",
  );
});
