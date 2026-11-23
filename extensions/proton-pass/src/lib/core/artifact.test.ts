import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PASS_CLI_VERSION, resolveArtifact } from "./artifact";
import { PassCliError } from "../types";

test("resolves pinned pass-cli 2.7.1 artifacts", () => {
  assert.deepEqual(resolveArtifact("darwin", "arm64"), {
    url: "https://proton.me/download/pass-cli/2.7.1/pass-cli-macos-aarch64",
    sha256: "0f5f749372c77f279f92463c56c3dda777fc3157e5f90ef49ade17bca7e46ba3",
    kind: "raw",
    binaryName: "pass-cli",
    requiredFiles: ["pass-cli"],
  });
  assert.deepEqual(resolveArtifact("darwin", "x64"), {
    url: "https://proton.me/download/pass-cli/2.7.1/pass-cli-macos-x86_64",
    sha256: "ea3a6a133292230008e577ebcdf1a0a604177fd9107fdee287c8ed84ef164cd9",
    kind: "raw",
    binaryName: "pass-cli",
    requiredFiles: ["pass-cli"],
  });
  assert.deepEqual(resolveArtifact("win32", "x64"), {
    url: "https://proton.me/download/pass-cli/2.7.1/pass-cli-windows-x86_64.zip",
    sha256: "d803bea784ee55abe6091fd4e493d8c3cfefaef48748b03760be73401fa3838a",
    kind: "zip",
    binaryName: "pass-cli.exe",
    requiredFiles: ["pass-cli.exe", "libcrypto-3-x64.dll"],
  });
});

test("rejects unsupported platform and architecture pairs", () => {
  assert.throws(
    () => resolveArtifact("win32", "arm64"),
    (error: unknown) => {
      assert.ok(error instanceof PassCliError);
      assert.equal(error.type, "unsupported_platform");
      assert.match(error.message, /Unsupported platform: win32-arm64/);
      return true;
    },
  );
  assert.throws(() => resolveArtifact("linux", "x64"), /Unsupported platform: linux-x64/);
});

test("the CLI Path preference and the README name the pass-cli version the extension downloads", () => {
  // The downloaded one, not the minimum ("version 2.5.1 or later").
  const versionsIn = (text: string) =>
    [...text.matchAll(/(?:pass-cli|downloads|downloads version) (\d+\.\d+\.\d+)/g)].map(([, version]) => version);
  const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
    preferences: { name: string; description: string }[];
  };
  const preference = manifest.preferences.find(({ name }) => name === "cliPath");
  assert.deepEqual(versionsIn(preference?.description ?? ""), [PASS_CLI_VERSION]);
  const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");
  const readmeLine = readme.split("\n").find((line) => line.startsWith("- **CLI Path**")) ?? "";
  assert.deepEqual(versionsIn(readmeLine), [PASS_CLI_VERSION]);
});
