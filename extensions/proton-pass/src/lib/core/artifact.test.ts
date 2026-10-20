import test from "node:test";
import assert from "node:assert/strict";
import { resolveArtifact } from "./artifact";
import { PassCliError } from "../types";

test("resolves pinned pass-cli 2.3.3 artifacts", () => {
  assert.deepEqual(resolveArtifact("darwin", "arm64"), {
    url: "https://proton.me/download/pass-cli/2.3.3/pass-cli-macos-aarch64",
    sha256: "3281587ac9c50ae2f1604ba75e9d1d39b6debb221b65a6cc56f64d626ede3dbc",
    kind: "raw",
    binaryName: "pass-cli",
    requiredFiles: ["pass-cli"],
  });
  assert.deepEqual(resolveArtifact("darwin", "x64"), {
    url: "https://proton.me/download/pass-cli/2.3.3/pass-cli-macos-x86_64",
    sha256: "275f6159f63d152ecdd9d4e2969ef515291619005e0d30ab762daee26081621c",
    kind: "raw",
    binaryName: "pass-cli",
    requiredFiles: ["pass-cli"],
  });
  assert.deepEqual(resolveArtifact("linux", "arm64"), {
    url: "https://proton.me/download/pass-cli/2.3.3/pass-cli-linux-aarch64",
    sha256: "9c3e85e10d3bb631ffe377f063d996b9cc9a545d30971bcedf5910e16d03542b",
    kind: "raw",
    binaryName: "pass-cli",
    requiredFiles: ["pass-cli"],
  });
  assert.deepEqual(resolveArtifact("linux", "x64"), {
    url: "https://proton.me/download/pass-cli/2.3.3/pass-cli-linux-x86_64",
    sha256: "b5b49a8b3fd0af8830c0c1979f28ea0c90ccece73f59023a8bca8245d4b68da9",
    kind: "raw",
    binaryName: "pass-cli",
    requiredFiles: ["pass-cli"],
  });
  assert.deepEqual(resolveArtifact("win32", "x64"), {
    url: "https://proton.me/download/pass-cli/2.3.3/pass-cli-windows-x86_64.zip",
    sha256: "4169c7644e3475f294d265e2f1262476573e41d372b905187222c52f1c6dbca5",
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
  assert.throws(() => resolveArtifact("linux", "ia32"), /Unsupported platform: linux-ia32/);
});
