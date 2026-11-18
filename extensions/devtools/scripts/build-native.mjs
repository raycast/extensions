import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = path.join(root, "native", "qr-helper.swift");
const target = path.join(root, "assets", "qr-helper");
const buildDirectory = path.join(root, ".native-build");
const architectures = ["arm64", "x86_64"];
mkdirSync(path.dirname(target), { recursive: true });

function isCurrentUniversalBinary() {
  if (!existsSync(target)) return false;
  const newestSource = Math.max(statSync(source).mtimeMs, statSync(fileURLToPath(import.meta.url)).mtimeMs);
  if (statSync(target).mtimeMs <= newestSource) return false;
  try {
    const slices = execFileSync("/usr/bin/lipo", ["-archs", target], { encoding: "utf8" }).trim().split(/\s+/);
    return architectures.every((architecture) => slices.includes(architecture));
  } catch {
    return false;
  }
}

if (isCurrentUniversalBinary()) {
  console.log("Universal QR helper is up to date.");
} else {
  console.log("Compiling the QR clipboard helper for Apple Silicon and Intel…");
  mkdirSync(buildDirectory, { recursive: true });
  try {
    const slices = architectures.map((architecture) => {
      const binary = path.join(buildDirectory, `qr-helper-${architecture}`);
      execFileSync(
        "/usr/bin/xcrun",
        ["--sdk", "macosx", "swiftc", "-O", "-target", `${architecture}-apple-macosx11.0`, source, "-o", binary],
        { stdio: "inherit" },
      );
      return binary;
    });
    const universal = path.join(buildDirectory, "qr-helper");
    execFileSync("/usr/bin/lipo", ["-create", ...slices, "-output", universal], { stdio: "inherit" });
    chmodSync(universal, 0o755);
    execFileSync("/usr/bin/codesign", ["--force", "--sign", "-", universal], { stdio: "inherit" });
    execFileSync("/usr/bin/codesign", ["--verify", "--strict", universal], { stdio: "inherit" });
    renameSync(universal, target);
  } catch (cause) {
    console.error(cause.message);
    console.error("The QR helper needs Apple's Command Line Tools. Install them with: xcode-select --install");
    process.exitCode = 1;
  } finally {
    rmSync(buildDirectory, { recursive: true, force: true });
  }
}
