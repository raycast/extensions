import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const latest = changelog.split(/^## /m)[1]?.replace(/\{PR_MERGE_DATE\}/g, "pending Store review");
if (!latest) throw new Error("Add a changelog entry before preparing a release.");
console.log(
  `Validated source commit: ${sha}\n\n## ${latest.trim()}\n\nThis is a draft release. Raycast Store publication requires a separate reviewed submission.\n\nThe source archive and Raycast bundle are attached with SHA-256 checksums. See the repository's publishing guide for submission instructions.`,
);
