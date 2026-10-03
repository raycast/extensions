import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

if (process.platform !== "darwin") throw new Error("Build on macOS with Xcode Command Line Tools.");
mkdirSync("assets", { recursive: true });
for (const arch of ["arm64", "x86_64"]) {
  execFileSync(
    "xcrun",
    [
      "swiftc",
      "-O",
      "-target",
      `${arch}-apple-macosx13.0`,
      "native/DisplayControl.swift",
      "-o",
      resolve(`assets/display-control-${arch}`),
    ],
    { stdio: "inherit" },
  );
  execFileSync("/usr/bin/codesign", ["--force", "--sign", "-", `assets/display-control-${arch}`], { stdio: "inherit" });
}

const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
writeFileSync(
  "native/build-manifest.json",
  JSON.stringify(
    {
      source: hash("native/DisplayControl.swift"),
      compiler: execFileSync("xcrun", ["swiftc", "--version"], { encoding: "utf8" }).trim(),
      deploymentTarget: "macOS 13.0",
      binaries: {
        "display-control-arm64": hash("assets/display-control-arm64"),
        "display-control-x86_64": hash("assets/display-control-x86_64"),
      },
    },
    null,
    2,
  ) + "\n",
);
