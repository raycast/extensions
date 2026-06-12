// Regenerates assets/extension-icon.png (512x512) from assets/icon.svg.
// Requires rsvg-convert (e.g. `brew install librsvg`).
const { execFileSync } = require("node:child_process");

execFileSync(
  "rsvg-convert",
  [
    "-w",
    "512",
    "-h",
    "512",
    "assets/icon.svg",
    "-o",
    "assets/extension-icon.png",
  ],
  { stdio: "inherit" },
);
console.log("assets/extension-icon.png regenerated from assets/icon.svg");
