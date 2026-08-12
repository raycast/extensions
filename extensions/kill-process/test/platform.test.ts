import * as assert from "node:assert/strict";
import { test } from "node:test";
import { getProcessListCommandSpec, isMac } from "../src/utils/platform";

test("uses direct ps invocation for macOS process listing", () => {
  if (!isMac) {
    return;
  }

  assert.deepEqual(getProcessListCommandSpec(), {
    executable: "ps",
    args: ["-eo", "pid,ppid,pcpu,rss,comm"],
  });
});
