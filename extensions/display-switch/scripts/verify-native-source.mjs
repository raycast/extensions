import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const manifest = JSON.parse(readFileSync("native/build-manifest.json", "utf8"));
const compiler = execFileSync("xcrun", ["swiftc", "--version"], { encoding: "utf8" }).trim();
if (compiler !== manifest.compiler)
  throw new Error("Use the recorded compiler, or rebuild both helpers with npm run build:native first.");
const directory = mkdtempSync(join(tmpdir(), "display-switch-source-"));
try {
  for (const arch of ["arm64", "x86_64"]) {
    const name = `display-control-${arch}`;
    const output = join(directory, name);
    execFileSync(
      "xcrun",
      ["swiftc", "-O", "-target", `${arch}-apple-macosx13.0`, "native/DisplayControl.swift", "-o", output],
      { stdio: "inherit" },
    );
    execFileSync("/usr/bin/codesign", ["--force", "--sign", "-", output], { stdio: "inherit" });
    const actual = createHash("sha256").update(readFileSync(output)).digest("hex");
    if (actual !== manifest.binaries[name]) throw new Error(`${name} differs from an independent source rebuild.`);
  }
  console.log("Both bundled executables match independently compiled and signed source builds.");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
