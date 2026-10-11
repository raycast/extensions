import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const binary = resolve("assets/codex-usage-helper");
if (!existsSync(binary) || process.argv.includes("--force")) {
  mkdirSync("build", { recursive: true });
  const objects = ["arm64", "x86_64"].map((arch) => {
    const output = resolve(`build/codex-usage-helper-${arch}`);
    execFileSync(
      "/usr/bin/xcrun",
      [
        "swiftc",
        "-O",
        "-swift-version",
        "5",
        "-target",
        `${arch}-apple-macosx13.0`,
        "assets/codex-usage-helper.swift",
        "-o",
        output,
      ],
      { stdio: "inherit" },
    );
    return output;
  });
  execFileSync("/usr/bin/lipo", ["-create", ...objects, "-output", binary]);
  execFileSync("/usr/bin/codesign", ["--force", "--sign", "-", binary], { stdio: "inherit" });
}
