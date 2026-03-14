import { chmod, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const sourceDir = path.join(projectRoot, "bin");
const assetsDir = path.join(projectRoot, "assets");

await mkdir(sourceDir, { recursive: true });
await mkdir(assetsDir, { recursive: true });

const helpers = [
  {
    sourcePath: path.join(sourceDir, "finder-copy-files.swift"),
    outputPath: path.join(assetsDir, "finder-copy-files"),
  },
];

for (const helper of helpers) {
  const result = spawnSync(
    "swiftc",
    ["-O", "-framework", "AppKit", "-framework", "Foundation", "-o", helper.outputPath, helper.sourcePath],
    {
      cwd: projectRoot,
      stdio: "inherit",
    },
  );

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.error) {
    throw result.error;
  }

  await chmod(helper.outputPath, 0o755);
}
