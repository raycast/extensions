import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generated = execFileSync("node", ["scripts/generate-reviewer-artifact-manifest.mjs"], {
  cwd: root,
  encoding: "utf8",
});
const snapshot = readFileSync(resolve(root, "native-review/reviewer-artifact-manifest.json"), "utf8");

if (generated !== snapshot) {
  process.stderr.write(
    "Reviewer artifact manifest drifted. Run npm run reviewer:manifest and update the reviewed snapshot.\n",
  );
  process.exit(1);
}

process.stdout.write("reviewer artifact manifest: current\n");
