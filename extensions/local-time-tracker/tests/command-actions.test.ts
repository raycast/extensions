import assert from "node:assert/strict";
import test from "node:test";
import { launchWithFailure } from "../src/lib/command-actions";

test("does not report a failure when a command opens successfully", async () => {
  let wasLaunched = false;
  let failureReported = false;

  await launchWithFailure(
    async () => {
      wasLaunched = true;
    },
    "Could not open Work Logs",
    async () => {
      failureReported = true;
    },
  );

  assert.equal(wasLaunched, true);
  assert.equal(failureReported, false);
});

test("reports the original error when a command cannot open", async () => {
  const error = new Error("The command is disabled");
  let receivedTitle: string | undefined;
  let receivedError: unknown;

  await launchWithFailure(
    async () => {
      throw error;
    },
    "Could not open Work Logs",
    async (title, reportedError) => {
      receivedTitle = title;
      receivedError = reportedError;
    },
  );

  assert.equal(receivedTitle, "Could not open Work Logs");
  assert.equal(receivedError, error);
});
