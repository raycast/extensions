const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

if (process.platform === "darwin") {
  const root = path.resolve(__dirname, "..");
  const source = path.join(__dirname, "open-editor-helper.swift");
  const output = path.join(root, "assets", "open-editor-helper");
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "raycast-editor-helper-"));
  try {
    const binaries = ["arm64", "x86_64"].map((architecture) => {
      const binary = path.join(temporary, architecture);
      execFileSync(
        "/usr/bin/xcrun",
        ["swiftc", "-O", "-target", architecture + "-apple-macosx12.0", source, "-o", binary],
        { stdio: "inherit" },
      );
      return binary;
    });
    execFileSync("/usr/bin/lipo", ["-create", ...binaries, "-output", output], { stdio: "inherit" });
    fs.chmodSync(output, 0o755);
    console.log("Built universal macOS editor-focus helper.");
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
