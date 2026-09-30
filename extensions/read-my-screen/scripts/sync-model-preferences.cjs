/**
 * Syncs `src/model-preferences.json` → `package.json` preferences.model.
 * Run: npm run sync-model-prefs
 */
const { readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const prefsPath = join(root, "src", "model-preferences.json");
const pkgPath = join(root, "package.json");

const prefs = JSON.parse(readFileSync(prefsPath, "utf8"));
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

const modelPref = pkg.preferences.find((p) => p.name === "model");
if (!modelPref) {
  console.error("package.json: preferences.model not found");
  process.exit(1);
}

if (!prefs.default || !Array.isArray(prefs.options) || prefs.options.length === 0) {
  console.error("model-preferences.json: requires default and non-empty options");
  process.exit(1);
}

const values = new Set(prefs.options.map((o) => o.value));
if (!values.has(prefs.default)) {
  console.error(`model-preferences.json: default "${prefs.default}" is not in options`);
  process.exit(1);
}

modelPref.default = prefs.default;
modelPref.data = prefs.options;

writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`Synced model preferences (${prefs.options.length} options, default: ${prefs.default})`);
