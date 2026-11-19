import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("first-run onboarding offers direct setup while retaining configured and error states", () => {
  const result = spawnSync(process.execPath, [new URL("./probes/onboarding.tsx", import.meta.url).pathname], {
    encoding: "utf8",
  });
  expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: "" });
});
