import { execFileSync } from "node:child_process";
import { mkdirSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "darwin") {
  throw new Error("Hide Details requires macOS and the Xcode Command Line Tools (xcode-select --install).");
}

const root = fileURLToPath(new URL("..", import.meta.url));
const buildDir = path.join(root, ".build");
mkdirSync(buildDir, { recursive: true });
mkdirSync(path.join(root, "assets"), { recursive: true });

for (const arch of ["arm64", "x86_64"]) {
  console.log(`Building Swift helper for ${arch}…`);
  execFileSync(
    "xcrun",
    [
      "swiftc",
      "-O",
      "-target",
      `${arch}-apple-macosx14.0`,
      "-module-cache-path",
      path.join(buildDir, "module-cache"),
      "-o",
      path.join(buildDir, `hide-details-${arch}`),
      path.join(root, "swift", "main.swift"),
      path.join(root, "swift", "CustomRegex.swift"),
      path.join(root, "swift", "Redaction.swift"),
      path.join(root, "swift", "Clipboard.swift"),
      "-framework",
      "Vision",
      "-framework",
      "AppKit",
      "-framework",
      "NaturalLanguage",
      "-framework",
      "CoreImage",
    ],
    { stdio: "inherit" },
  );
}

const binary = path.join(buildDir, "hide-details");
execFileSync(
  "xcrun",
  [
    "lipo",
    "-create",
    ...["arm64", "x86_64"].map((arch) => path.join(buildDir, `hide-details-${arch}`)),
    "-output",
    binary,
  ],
  { stdio: "inherit" },
);
execFileSync("codesign", ["--force", "--sign", "-", binary], { stdio: "inherit" });
renameSync(binary, path.join(root, "assets", "hide-details"));
console.log("Swift helper bundled in assets/hide-details.");
