import { cpSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, ".release");
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
const files = ["package.json", "package-lock.json", "README.md", "SECURITY.md", "LICENSE", "CHANGELOG.md", "ai.yaml", "tsconfig.json", "eslint.config.js", ".prettierrc", ".gitignore", "raycast-env.d.ts"];
for (const file of files) cpSync(join(root, file), join(output, file));
function copySource(relative) {
  mkdirSync(join(output, relative), { recursive: true });
  for (const entry of readdirSync(join(root, relative), { withFileTypes: true })) {
    const path = join(relative, entry.name);
    if (entry.isDirectory()) copySource(path);
    else if (entry.isFile() && /\.tsx?$/.test(entry.name)) cpSync(join(root, path), join(output, path));
  }
}
copySource("src");
mkdirSync(join(output, "assets"));
cpSync(join(root, "assets/tiro-icon.png"), join(output, "assets/tiro-icon.png"));
mkdirSync(join(output, "metadata"));
for (const entry of readdirSync(join(root, "metadata"), { withFileTypes: true })) {
  if (entry.isFile() && /\.png$/i.test(entry.name)) {
    cpSync(join(root, "metadata", entry.name), join(output, "metadata", entry.name));
  }
}
mkdirSync(join(output, "scripts"));
for (const file of ["test-recording-links.mjs", "check-package.mjs", "package-release.mjs"]) cpSync(join(root, "scripts", file), join(output, "scripts", file));
const checked = spawnSync(process.execPath, [join(root, "scripts/check-package.mjs"), output], { stdio: "inherit" });
if (checked.status !== 0) {
  rmSync(output, { recursive: true, force: true });
  process.exit(1);
}
console.log("Approved release staging is ready.");
