import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL(".", import.meta.url));
const testFiles = readdirSync(directory)
  .filter((name) => name.endsWith(".test.mjs"))
  .map((name) => join(directory, name));

for (const timezone of ["America/Toronto", "America/Vancouver", "UTC", "Asia/Tokyo"]) {
  console.log(`Testing in ${timezone}`);
  const result = spawnSync(process.execPath, ["--test", ...testFiles], {
    env: { ...process.env, TZ: timezone },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
