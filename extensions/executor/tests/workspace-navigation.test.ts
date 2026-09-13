import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("embedded workspace picker preserves the current command and opens a different workspace once", () => {
  const result = spawnSync(process.execPath, [new URL("./probes/workspace-navigation.tsx", import.meta.url).pathname], {
    encoding: "utf8",
  });
  expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: "" });
});
