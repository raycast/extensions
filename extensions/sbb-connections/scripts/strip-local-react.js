const fs = require("fs");
const path = require("path");

const targets = ["react", "react-dom"].map((name) =>
  path.join(__dirname, "..", "node_modules", name),
);

for (const target of targets) {
  if (!fs.existsSync(target)) {
    continue;
  }

  fs.rmSync(target, { recursive: true, force: true });
  console.log(`Removed local ${path.basename(target)} (use Raycast host React)`);
}
