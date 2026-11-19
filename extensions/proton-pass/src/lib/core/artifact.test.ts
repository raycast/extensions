import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PASS_CLI_VERSION, resolveArtifact } from "./artifact";
import { PassCliError } from "../types";

test("resolves pinned pass-cli 2.5.1 artifacts", () => {
  assert.deepEqual(resolveArtifact("darwin", "arm64"), {
    url: "https://proton.me/download/pass-cli/2.5.1/pass-cli-macos-aarch64",
    sha256: "2c5834dd21bef341db70c39eaa0a353d4b9e49a8a0d4e5579c02f62ed70db3d9",
    kind: "raw",
    binaryName: "pass-cli",
    requiredFiles: ["pass-cli"],
  });
  assert.deepEqual(resolveArtifact("darwin", "x64"), {
    url: "https://proton.me/download/pass-cli/2.5.1/pass-cli-macos-x86_64",
    sha256: "fed0d6a919b8b05921c508cdd4cfe8c05a0b0cf4ccc55ed036e3b51ace6f7373",
    kind: "raw",
    binaryName: "pass-cli",
    requiredFiles: ["pass-cli"],
  });
  assert.deepEqual(resolveArtifact("win32", "x64"), {
    url: "https://proton.me/download/pass-cli/2.5.1/pass-cli-windows-x86_64.zip",
    sha256: "d1000e98de533b3e074e9bebf0f7dd562ee228030dc2dbba2bd454d5c0067511",
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
    [...text.matchAll(/(?:pass-cli|downloads) (\d+\.\d+\.\d+)/g)].map(([, version]) => version);
  const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
    preferences: { name: string; description: string }[];
  };
  const preference = manifest.preferences.find(({ name }) => name === "cliPath");
  assert.deepEqual(versionsIn(preference?.description ?? ""), [PASS_CLI_VERSION]);
  const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");
  const readmeLine = readme.split("\n").find((line) => line.startsWith("- **CLI Path**")) ?? "";
  assert.deepEqual(versionsIn(readmeLine), [PASS_CLI_VERSION]);
});
