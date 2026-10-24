import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const status = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" });
if (status.trim()) throw new Error("Commit changes before exporting a Store submission.");
const roots = new Set([
  "package.json",
  "package-lock.json",
  "README.md",
  "PUBLISHING.md",
  "CHANGELOG.md",
  "LICENSE",
  "tsconfig.json",
  "tsconfig.test.json",
  "raycast-env.d.ts",
  "eslint.config.mjs",
  ".gitignore",
  ".prettierignore",
  ".prettierrc.json",
]);
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter((file) => roots.has(file) || /^(src|assets|tests|scripts|metadata|media)\//.test(file));
mkdirSync("release", { recursive: true });
writeFileSync(
  "release/store-source.tar.gz",
  execFileSync("git", ["archive", "--format=tar.gz", "HEAD", "--", ...files], { maxBuffer: 20 * 1024 * 1024 }),
);
console.log("Exported committed extension files to release/store-source.tar.gz");
