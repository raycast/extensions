import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("native continuation rechecks exact terms and refreshes stale review forms without resuming", () => {
  const result = spawnSync(process.execPath, [new URL("./probes/execution-result.tsx", import.meta.url).pathname], {
    encoding: "utf8",
  });
  expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: "" });
});
