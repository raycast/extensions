import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
if (process.platform !== "darwin" || process.arch !== "arm64") {
  throw new Error(
    "Build on an Apple Silicon Mac with macOS 26.4 or later and Xcode Command Line Tools.",
  );
}
function build(sources, output) {
  execFileSync(
    "xcrun",
    [
      "swiftc",
      "-O",
      "-parse-as-library",
      "-target",
      "arm64-apple-macos26.4",
      ...sources,
      "-o",
      output,
    ],
    { cwd: root, stdio: "inherit" },
  );
}
build(
  ["native/Engine.swift", "native/Translate.swift"],
  "assets/apple-translate",
);
execFileSync(
  "/usr/bin/codesign",
  ["--force", "--sign", "-", "assets/apple-translate"],
  { cwd: root, stdio: "inherit" },
);
const app = `${root}assets/Apple Translate.app`;
mkdirSync(`${app}/Contents/MacOS`, { recursive: true });
mkdirSync(`${app}/Contents/Resources`, { recursive: true });
copyFileSync(`${root}assets/icon.png`, `${app}/Contents/Resources/icon.png`);
writeFileSync(
  `${app}/Contents/Info.plist`,
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>local.raycast.apple-offline-translate.window</string>
<key>CFBundleName</key><string>Apple Translate</string>
<key>CFBundleExecutable</key><string>AppleTranslate</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleVersion</key><string>2</string>
<key>CFBundleShortVersionString</key><string>2.0.0</string>
<key>CFBundleIconFile</key><string>icon.png</string>
<key>LSMinimumSystemVersion</key><string>26.4</string>
<key>NSHighResolutionCapable</key><true/>
</dict></plist>`,
);
build(
  ["native/Engine.swift", "native/Window.swift"],
  `${app}/Contents/MacOS/AppleTranslate`,
);
execFileSync("/usr/bin/codesign", ["--force", "--sign", "-", app], {
  cwd: root,
  stdio: "inherit",
});
