import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { parseVolumes } from "../src/volumes";

// Runs the script the extension runs, so a change to it is checked on a Mac, such as CI's.
test.skipIf(process.platform !== "darwin")("mounted-volumes.js lists the startup disk first", () => {
  const script = join(__dirname, "..", "assets", "mounted-volumes.js");
  const output = execFileSync("osascript", ["-l", "JavaScript", script], { encoding: "utf8" });
  const volumes = parseVolumes(output);
  expect(volumes.length).toBeGreaterThan(0);
  expect(volumes[0]).toMatchObject({ path: "/", isStartupDisk: true });
  expect(volumes[0].totalCapacity).toBeGreaterThan(0);
  expect(volumes[0].availableCapacity).toBeGreaterThan(0);
  expect(JSON.parse(output)).toHaveLength(volumes.length);
});
