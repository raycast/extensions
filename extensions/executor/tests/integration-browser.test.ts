import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("Browse Integrations uses the same provider artwork as the shared directory", () => {
  const result = spawnSync(process.execPath, [new URL("./probes/integration-browser.tsx", import.meta.url).pathname], {
    encoding: "utf8",
  });
  expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: "" });
});
