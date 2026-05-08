import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const outputRoot = path.join(
  process.cwd(),
  "assets",
  ".generated",
  "ccusage-cli",
);

const packages = ["ccusage", "@ccusage/codex", "@ccusage/amp"];

await rm(outputRoot, { force: true, recursive: true });

for (const packageName of packages) {
  const packageJsonPath = require.resolve(`${packageName}/package.json`);
  const packageRoot = path.dirname(packageJsonPath);
  const outputPackageRoot = path.join(outputRoot, packageName);

  await mkdir(outputPackageRoot, { recursive: true });
  await cp(path.join(packageRoot, "dist"), path.join(outputPackageRoot, "dist"), {
    recursive: true,
  });
  await writeFile(
    path.join(outputPackageRoot, "package.json"),
    `${JSON.stringify({ type: "module" }, null, 2)}\n`,
  );
}
