import { readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

// Expand the file list ourselves: Windows shells don't expand globs.
const files = readdirSync("tests")
  .filter((file) => file.endsWith(".test.ts"))
  .sort()
  .map((file) => join("tests", file));
execFileSync(process.execPath, ["--import", "tsx", "--test", ...files], { stdio: "inherit" });
