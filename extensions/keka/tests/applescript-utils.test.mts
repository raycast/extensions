import assert from "node:assert/strict";
import { mock, test } from "node:test";

let resolveAppleScript: (() => void) | undefined;

const runAppleScript = mock.fn(
  () =>
    new Promise<void>((resolve) => {
      resolveAppleScript = resolve;
    }),
);

mock.module("@raycast/utils", {
  exports: {
    runAppleScript,
    showFailureToast: mock.fn(async () => undefined),
  },
});

const {
  scriptCompressFiles,
  scriptExtractFiles,
  scriptSendFiles,
} = await import("../src/utils/applescript-utils.ts");

const actions = [
  ["compress", scriptCompressFiles],
  ["extract", scriptExtractFiles],
  ["send", scriptSendFiles],
] as const;

for (const [action, execute] of actions) {
  test(`${action} waits for AppleScript execution`, async () => {
    let settled = false;
    const execution = execute(["/tmp/example.txt"]);
    void execution.then(() => {
      settled = true;
    });

    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(settled, false);
    assert.ok(resolveAppleScript);

    resolveAppleScript();
    await execution;

    assert.equal(settled, true);
  });
}
