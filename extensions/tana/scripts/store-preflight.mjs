import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const fail = (message) => {
  throw new Error(message);
};

const manifest = readJson("package.json");
const privatePattern =
  "eyJ0eXAi|[[:alnum:]._%+-]+@[[:alnum:].-]+\\.[[:alpha:]]{2,}|deleted nodes|Codex[A-Za-z0-9_-]*|A93F62|T_PZHLiURIEB|d5gJFil6w5d1|CogM7iS310oy";

if (manifest.author !== "leodknuth") {
  fail(`package.json author must be the Raycast username "leodknuth"; got "${manifest.author}"`);
}

for (const path of ["assets/tana-icon.png", "metadata/tana-2.png", "metadata/tana-3.png", "metadata/tana-4.png"]) {
  if (!existsSync(resolve(root, path))) {
    fail(`Missing required Store asset: ${path}`);
  }
}

if (existsSync(resolve(root, "docs/Archive/2026-06-23-tana-raycast-local-mcp-closure"))) {
  fail("Private implementation audit archive must not be present in the Store release branch");
}

let scan = "";
try {
  scan = execFileSync(
    "rg",
    [
      "-n",
      "-i",
      privatePattern,
      ".",
      "-g",
      "!node_modules",
      "-g",
      "!dist",
      "-g",
      "!scripts/store-preflight.mjs",
      "-g",
      "!docs/store-release-lisp-task-stack.md",
    ],
    { cwd: root, encoding: "utf8" },
  );
} catch (error) {
  if (error.status !== 1) {
    throw error;
  }
}

const unexpected = scan
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((line) => !line.includes('"type": "password"'))
  .filter((line) => !line.includes('"name": "workspaceApiToken"'));

if (unexpected.length > 0) {
  fail(`Potential private or secret material found:\n${unexpected.join("\n")}`);
}

console.log("Store preflight passed");
