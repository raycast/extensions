import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const { waitFor, CONTROL_ACK_TIMEOUT_MS } = await import(
  pathToFileURL(process.argv[2]).href
);

function clock() {
  let elapsed = 0;
  return {
    now: () => elapsed,
    sleep: async (milliseconds) => {
      elapsed += milliseconds;
    },
  };
}

for (const phase of ["paused", "finalizing"]) {
  const timer = clock();
  const acknowledged = await waitFor(
    async () =>
      timer.now() >= 29_000
        ? { phase, requestID: "current" }
        : { phase: "recording", requestID: "old" },
    (state) => state.requestID === "current" || state.phase === "failed",
    undefined,
    timer,
  );
  assert.equal(acknowledged.phase, phase);
  assert.equal(timer.now(), 29_000);
}

const recoveryTimer = clock();
const failed = await waitFor(
  async () =>
    recoveryTimer.now() >= 65_000
      ? { phase: "failed", message: "Source audio preserved" }
      : { phase: "recording" },
  (state) => state.phase === "failed",
  undefined,
  recoveryTimer,
);
assert.equal(failed.message, "Source audio preserved");

const timeoutTimer = clock();
await assert.rejects(
  waitFor(
    async () => undefined,
    () => true,
    undefined,
    timeoutTimer,
  ),
  /did not acknowledge/,
);
assert.equal(timeoutTimer.now(), CONTROL_ACK_TIMEOUT_MS);

console.log(
  "4 command acknowledgement tests passed (delayed pause/stop, delayed recovery, bounded timeout).",
);
