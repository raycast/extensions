const fs = require("fs");
const path = require("path");

const extensionRoot = path.resolve(__dirname, "..");
const engineRoot = path.resolve(extensionRoot, "..", "engine");
const assetsRoot = path.join(extensionRoot, "assets", "engine");

if (!fs.existsSync(engineRoot)) {
  console.error(`Engine directory not found: ${engineRoot}`);
  process.exit(1);
}

fs.rmSync(assetsRoot, { recursive: true, force: true });
fs.mkdirSync(assetsRoot, { recursive: true });

for (const entry of fs.readdirSync(engineRoot, { withFileTypes: true })) {
  if (entry.name === "tests" || entry.name === "node_modules") {
    continue;
  }
  fs.cpSync(path.join(engineRoot, entry.name), path.join(assetsRoot, entry.name), {
    recursive: true,
  });
}

console.log(`Synced engine -> ${path.relative(extensionRoot, assetsRoot)}`);
