// Pre-publish check. `ray publish` copies this whole folder into a public pull request on
// raycast/extensions, skipping only a fixed list of names; it does not read .gitignore. This
// script walks the same files and fails if anything secret or generated would be uploaded, or if
// a store requirement is missing.
//
//   node scripts/check-publish.js
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
// The exclusion list from @raycast/api's publish copy step (dist/utils/publish/copy-dir.js).
const SKIPPED_BY_PUBLISH = new Set([
  ".git",
  ".github",
  "node_modules",
  "raycast-env.d.ts",
  ".direnv",
  ".raycast-swift-build",
  ".swiftpm",
  "compiled_raycast_swift",
  "compiled_raycast_rust",
]);
const KEY_PATTERN = /kto_(?!FAKE_)[A-Za-z0-9_-]{16,}/; // test fixtures use kto_FAKE_…
const BEARER_PATTERN = /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./; // JWT-looking access/ID tokens

const problems = [];
const files = [];

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIPPED_BY_PUBLISH.has(name)) continue;
    const full = path.join(dir, name);
    const rel = path.relative(root, full);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (["dist", "coverage", ".claude"].includes(name)) problems.push(`${rel}/ would be published; delete it first`);
      else walk(full);
      continue;
    }
    files.push(rel);
    if (/^\.env/.test(name) || /\.(pem|key|p12)$/.test(name)) problems.push(`${rel} would be published; move it out of the extension folder`);
    if (stat.size < 2_000_000 && !/\.(png|jpg|jpeg|gif|ico)$/i.test(name)) {
      const text = fs.readFileSync(full, "utf8");
      if (KEY_PATTERN.test(text)) problems.push(`${rel} contains something that looks like a Keito API key`);
      if (BEARER_PATTERN.test(text) && !rel.endsWith(".test.ts")) problems.push(`${rel} contains something that looks like a token`);
    }
  }
}
walk(root);

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.license !== "MIT") problems.push("package.json license must be MIT");
if (!files.includes("package-lock.json")) problems.push("package-lock.json is missing");
const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
if (!/^## \[[^\]]+\] - \{PR_MERGE_DATE\}/m.test(changelog)) {
  problems.push("CHANGELOG.md needs a new entry like `## [Title] - {PR_MERGE_DATE}`");
}
const screenshots = files.filter((f) => f.startsWith(`metadata${path.sep}`) && f.endsWith(".png"));
// Raycast recommends at least three screenshots but doesn't require them, so this only warns.
if (screenshots.length < 3) {
  console.warn(`Warning: metadata/ has ${screenshots.length} screenshot(s); add 3–6 (2000×1250 PNG, Raycast Window Capture → Save to Metadata)`);
}

if (problems.length) {
  console.error("Not ready to publish:\n" + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}
console.log(`Ready to publish: ${files.length} files checked, no secrets found.`);
