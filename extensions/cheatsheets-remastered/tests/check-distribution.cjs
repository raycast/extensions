// Validate the actual Raycast distribution output, not an npm pack approximation.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const distribution = path.join(root, "dist");
const read = (file) => fs.readFileSync(file, "utf8");
const packages = fs
  .readdirSync(path.join(distribution, "node_modules"))
  .filter((name) => fs.statSync(path.join(distribution, "node_modules", name)).isDirectory());
function notices() {
  const sections = [
    "Software notices\n\nExtension software: Cheatsheets Remastered\n\n" + read(path.join(root, "LICENSE")),
  ];
  for (const name of packages.sort()) {
    const original = path.join(root, "node_modules", name);
    const metadata = JSON.parse(read(path.join(original, "package.json")));
    const licenses = fs.readdirSync(original).filter((file) => /^(?:licen[sc]e(?:\.md|\.txt)?|copying)$/i.test(file));
    let text = licenses.map((file) => read(path.join(original, file))).join("\n\n");
    if (!text && ["agent-base", "https-proxy-agent"].includes(name)) {
      const source = read(path.join(original, "README.md"));
      text = source.slice(source.indexOf("License\n-------"));
    }
    assert.match(text, /Permission|Redistribution|permission/, `Missing original notice for ${name}`);
    sections.push(`\n${"=".repeat(70)}\n${name} ${metadata.version} (${metadata.license})\n\n${text}`);
  }
  return sections.join("\n").trimEnd() + "\n";
}
const noticePath = path.join(root, "assets/THIRD-PARTY-NOTICES.txt");
if (process.argv.includes("--write-notices")) {
  fs.writeFileSync(noticePath, notices());
  console.log(`Retained extension MIT and ${packages.length} redistributed dependency notices`);
  process.exit(0);
}
assert.equal(read(noticePath), notices(), "Regenerate software notices for the actual bundled packages");
const pkg = JSON.parse(read(path.join(distribution, "package.json")));
assert.equal(pkg.name, "cheatsheets-remastered");
assert.equal(pkg.author, "smcnab1");
assert.equal(pkg.owner, undefined);
assert.deepEqual(pkg.platforms, ["macOS"]);
assert.deepEqual(
  pkg.commands.map((command) => command.name),
  ["show-cheatsheets", "create-custom-cheatsheet", "manage-custom-cheatsheets", "manage-repos"],
);
for (const command of pkg.commands) {
  const file = read(path.join(distribution, `${command.name}.js`));
  assert.ok(
    !file.includes("Synthetic Acceptance") && !file.includes("control.json") && !file.includes("cheatsheets-native-"),
  );
}
for (const forbidden of ["release", "tests", "docs", "metadata", "verify-fixtures.js"]) {
  assert.ok(!fs.existsSync(path.join(distribution, forbidden)), `Release-only file distributed: ${forbidden}`);
}
function files(directory, prefix = "") {
  return fs
    .readdirSync(directory)
    .flatMap((name) => {
      const relative = path.join(prefix, name);
      const absolute = path.join(directory, name);
      return fs.statSync(absolute).isDirectory() ? files(absolute, relative) : [relative];
    })
    .sort();
}
const originalAssets = path.join(root, "assets"),
  bundledAssets = path.join(distribution, "assets");
assert.deepEqual(files(bundledAssets), files(originalAssets));
for (const file of files(originalAssets))
  assert.deepEqual(
    fs.readFileSync(path.join(bundledAssets, file)),
    fs.readFileSync(path.join(originalAssets, file)),
    `Asset mismatch: ${file}`,
  );
console.log(
  `PASS: 4 commands; ${files(bundledAssets).length} assets match exactly; ${packages.length} dependency notices; no release reports or new fixtures`,
);
