import { execFileSync } from "node:child_process";

// A quarter-width radius matches the rounded-square reference icons.
execFileSync(
  "magick",
  [
    "artwork/icon-master.webp",
    "-resize",
    "512x512",
    "(",
    "-size",
    "512x512",
    "xc:black",
    "-fill",
    "white",
    "-draw",
    "roundrectangle 0,0 511,511 128,128",
    ")",
    "-alpha",
    "off",
    "-compose",
    "CopyOpacity",
    "-composite",
    "-strip",
    "assets/extension-icon.png",
  ],
  { cwd: new URL("../", import.meta.url), stdio: "inherit" },
);
