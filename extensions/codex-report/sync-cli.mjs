// Copies the published codex-report CLI (pinned devDependency) into assets; the Store build only sees this folder.
// `--dev` copies the CLI from the surrounding codex-report repository instead, for unreleased changes.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
const root = new URL(process.argv.includes("--dev") ? "../" : "node_modules/codex-report/", import.meta.url);
const assets = new URL("assets/", import.meta.url);
mkdirSync(assets, { recursive: true });
const source = readFileSync(new URL("bin/codex-report.js", root), "utf8");
writeFileSync(new URL("codex-report.mjs", assets), source.replaceAll('"../lib/', '"./lib/'));
const library = new URL("lib/", assets);
rmSync(library, { recursive: true, force: true });
cpSync(new URL("lib/", root), library, { recursive: true });
writeFileSync(new URL("package.json", library), JSON.stringify({ type: "module" }));
