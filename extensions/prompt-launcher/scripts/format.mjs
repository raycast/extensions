import { spawn } from "node:child_process";
import path from "node:path";

const prettierTargets = [
  "src/**/*.{ts,tsx}",
  "scripts/*.mjs",
  "README.md",
  "README.ja.md",
  "CHANGELOG.md",
  "docs/**/*.md",
  "package.json",
  "tsconfig.json",
  "eslint.config.js",
  ".prettierrc",
  ".github/dependabot.yml",
  ".github/workflows/*.yml",
  ".github/release-manifest.json",
  ".github/release-changelog/*.md",
];

const mode = process.argv[2];

if (mode !== "--check" && mode !== "--write") {
  console.error("Usage: node scripts/format.mjs <--check|--write>");
  process.exit(1);
}

const prettierBin = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prettier.cmd" : "prettier",
);

const prettier = spawn(prettierBin, [mode, ...prettierTargets], {
  stdio: "inherit",
});

prettier.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
