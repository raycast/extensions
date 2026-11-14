import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("connection form preserves origin through loading and never substitutes another integration", () => {
  const result = spawnSync(process.execPath, [new URL("./probes/connection-context.tsx", import.meta.url).pathname], {
    encoding: "utf8",
  });
  expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: "" });
});
