const { execFileSync } = require("node:child_process");
const { mkdirSync, copyFileSync } = require("node:fs");
const path = require("node:path");

if (process.platform !== "darwin") throw new Error("Build the native player on macOS with Xcode Command Line Tools.");
const app = path.resolve(__dirname, "../assets/MusicCatalogPlayer.app");
const contents = path.join(app, "Contents");
const executable = path.join(contents, "MacOS/MusicCatalogPlayer");
mkdirSync(path.dirname(executable), { recursive: true });
copyFileSync(path.join(__dirname, "Info.plist"), path.join(contents, "Info.plist"));
execFileSync(
  "/usr/bin/xcrun",
  [
    "clang",
    "-fobjc-arc",
    "-O2",
    "-Wall",
    "-Wextra",
    "-arch",
    "arm64",
    "-arch",
    "x86_64",
    "-mmacosx-version-min=13.0",
    "-framework",
    "Foundation",
    "-Wl,-sectcreate,__TEXT,__info_plist," + path.join(contents, "Info.plist"),
    path.join(__dirname, "MusicCatalogPlayer.m"),
    "-o",
    executable,
  ],
  { stdio: "inherit" },
);
execFileSync("/usr/bin/codesign", ["--force", "--sign", "-", app], { stdio: "inherit" });
execFileSync("/usr/bin/codesign", ["--verify", "--strict", app], { stdio: "inherit" });
console.log("Built the universal, ad-hoc signed MusicCatalogPlayer.app. Rebuilds may require Music permission again.");
